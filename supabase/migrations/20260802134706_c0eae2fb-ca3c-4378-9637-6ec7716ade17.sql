-- Sprint 03 canonical result and typed trace persistence.
CREATE TABLE public.delivery_intelligence_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL UNIQUE REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  schema_version text NOT NULL,
  engine_version text NOT NULL,
  configuration_set_id text NOT NULL,
  configuration_digest text NOT NULL CHECK (configuration_digest ~ '^[0-9a-f]{64}$'),
  result_hash text NOT NULL CHECK (result_hash ~ '^[0-9a-f]{64}$'),
  canonical_result jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_intelligence_result_scope CHECK (
    canonical_result #>> '{scope,organisationId}' = organisation_id::text
    AND canonical_result #>> '{scope,workspaceId}' = workspace_id::text
    AND canonical_result #>> '{analysisRunId}' = analysis_run_id::text
  )
);

CREATE TABLE public.delivery_intelligence_trace_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  node_type text NOT NULL,
  domain_id text NOT NULL,
  domain_version text NOT NULL,
  configuration_set_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  visible boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_run_id, node_type, domain_id)
);

CREATE TABLE public.delivery_intelligence_trace_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  source_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  target_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  edge_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_run_id, source_node_id, target_node_id, edge_type),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX delivery_intelligence_results_tenant_idx
  ON public.delivery_intelligence_results (organisation_id, workspace_id, published_at DESC);
CREATE INDEX delivery_intelligence_trace_nodes_scope_idx
  ON public.delivery_intelligence_trace_nodes (organisation_id, workspace_id, analysis_run_id, node_type);
CREATE INDEX delivery_intelligence_trace_edges_scope_idx
  ON public.delivery_intelligence_trace_edges (organisation_id, workspace_id, analysis_run_id, source_node_id);

CREATE FUNCTION public.enforce_delivery_intelligence_edge_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE source_node public.delivery_intelligence_trace_nodes;
DECLARE target_node public.delivery_intelligence_trace_nodes;
BEGIN
  SELECT * INTO source_node FROM public.delivery_intelligence_trace_nodes WHERE id = NEW.source_node_id;
  SELECT * INTO target_node FROM public.delivery_intelligence_trace_nodes WHERE id = NEW.target_node_id;
  IF source_node.analysis_run_id <> NEW.analysis_run_id OR target_node.analysis_run_id <> NEW.analysis_run_id
    OR source_node.organisation_id <> NEW.organisation_id OR target_node.organisation_id <> NEW.organisation_id
    OR source_node.workspace_id <> NEW.workspace_id OR target_node.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'cross-run or cross-tenant trace edges are forbidden';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_intelligence_edge_scope
  BEFORE INSERT ON public.delivery_intelligence_trace_edges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_delivery_intelligence_edge_scope();

CREATE TRIGGER delivery_intelligence_results_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_intelligence_results
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER delivery_intelligence_trace_nodes_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_intelligence_trace_nodes
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER delivery_intelligence_trace_edges_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_intelligence_trace_edges
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.delivery_intelligence_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_intelligence_trace_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_intelligence_trace_edges ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.can_read_delivery_intelligence(p_organisation_id uuid, p_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_memberships membership
    JOIN public.workspaces workspace ON workspace.id = p_workspace_id
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace.organisation_id = p_organisation_id AND workspace.is_deleted = false
  );
$$;

CREATE POLICY "Members can read canonical intelligence results"
  ON public.delivery_intelligence_results FOR SELECT TO authenticated
  USING (public.can_read_delivery_intelligence(organisation_id, workspace_id));
CREATE POLICY "Members can read intelligence trace nodes"
  ON public.delivery_intelligence_trace_nodes FOR SELECT TO authenticated
  USING (public.can_read_delivery_intelligence(organisation_id, workspace_id));
CREATE POLICY "Members can read intelligence trace edges"
  ON public.delivery_intelligence_trace_edges FOR SELECT TO authenticated
  USING (public.can_read_delivery_intelligence(organisation_id, workspace_id));

REVOKE ALL ON FUNCTION public.can_read_delivery_intelligence(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_delivery_intelligence(uuid, uuid) TO authenticated, service_role;
GRANT SELECT ON public.delivery_intelligence_results, public.delivery_intelligence_trace_nodes,
  public.delivery_intelligence_trace_edges TO authenticated;
GRANT ALL ON public.delivery_intelligence_results, public.delivery_intelligence_trace_nodes,
  public.delivery_intelligence_trace_edges TO service_role;

COMMENT ON TABLE public.delivery_intelligence_results IS
  'One immutable canonical result per completed analysis run; all audience projections derive from this row.';

CREATE FUNCTION public.publish_delivery_intelligence_result(
  p_run_id uuid,
  p_lease_owner text,
  p_result_hash text,
  p_canonical_result jsonb,
  p_trace_nodes jsonb,
  p_trace_edges jsonb
)
RETURNS SETOF public.assessment_analysis_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE run public.assessment_analysis_runs;
DECLARE node jsonb;
DECLARE edge jsonb;
BEGIN
  SELECT * INTO run FROM public.assessment_analysis_runs
  WHERE id = p_run_id AND status = 'running' AND lease_owner = p_lease_owner
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'analysis run is not owned by this worker'; END IF;
  IF p_result_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid result hash'; END IF;

  INSERT INTO public.delivery_intelligence_results (
    analysis_run_id, organisation_id, workspace_id, schema_version, engine_version,
    configuration_set_id, configuration_digest, result_hash, canonical_result
  ) VALUES (
    run.id, run.organisation_id, run.workspace_id,
    p_canonical_result->>'schemaVersion', run.engine_version,
    run.configuration_set_id, run.configuration_digest, p_result_hash, p_canonical_result
  );

  FOR node IN SELECT * FROM jsonb_array_elements(p_trace_nodes) LOOP
    INSERT INTO public.delivery_intelligence_trace_nodes (
      id, analysis_run_id, organisation_id, workspace_id, node_type, domain_id,
      domain_version, configuration_set_id, content_hash, visible, payload
    ) VALUES (
      (node->>'id')::uuid, run.id, run.organisation_id, run.workspace_id,
      node->>'nodeType', node->>'domainId', node->>'domainVersion',
      run.configuration_set_id, node->>'contentHash', COALESCE((node->>'visible')::boolean, false), node->'payload'
    );
  END LOOP;

  FOR edge IN SELECT * FROM jsonb_array_elements(p_trace_edges) LOOP
    INSERT INTO public.delivery_intelligence_trace_edges (
      analysis_run_id, organisation_id, workspace_id, source_node_id, target_node_id, edge_type
    ) VALUES (
      run.id, run.organisation_id, run.workspace_id,
      (edge->>'source')::uuid, (edge->>'target')::uuid, edge->>'type'
    );
  END LOOP;

  RETURN QUERY UPDATE public.assessment_analysis_runs updated
  SET status = 'completed', completed_at = now(), lease_owner = NULL, lease_expires_at = NULL
  WHERE updated.id = run.id RETURNING updated.*;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_delivery_intelligence_result(uuid, text, text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_delivery_intelligence_result(uuid, text, text, jsonb, jsonb, jsonb) TO service_role;