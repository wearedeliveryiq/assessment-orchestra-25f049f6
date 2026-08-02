CREATE TYPE public.recommendation_confidence_gate_result AS ENUM (
  'presented', 'withheld', 'evidence_first'
);

CREATE TABLE public.recommendation_confidence_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  intelligence_result_id uuid NOT NULL REFERENCES public.delivery_intelligence_results(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  confidence_version text NOT NULL,
  gate_engine_version text NOT NULL,
  confidence_index numeric(9,6) NOT NULL CHECK (confidence_index BETWEEN 0 AND 100),
  confidence_state public.recommendation_confidence_state NOT NULL,
  limitation_codes jsonb NOT NULL CHECK (jsonb_typeof(limitation_codes) = 'array'),
  caveat text,
  confidence_trace_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_gate jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recommendation_evaluation_id, policy_version),
  CONSTRAINT recommendation_confidence_gate_caveat CHECK (
    (confidence_state = 'high' AND caveat IS NULL)
    OR (confidence_state IN ('low', 'moderate') AND caveat IS NOT NULL AND length(btrim(caveat)) > 0)
  ),
  CONSTRAINT recommendation_confidence_gate_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'intelligenceResultId' = intelligence_result_id::text
    AND canonical_input ->> 'recommendationEvaluationId' = recommendation_evaluation_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
    AND canonical_input ->> 'confidenceVersion' = confidence_version
    AND (canonical_input ->> 'analysisConfidence')::numeric = confidence_index
    AND canonical_input ->> 'confidenceState' = confidence_state::text
    AND canonical_input -> 'limitationCodes' = limitation_codes
    AND (canonical_input ->> 'confidenceTraceNodeId')::uuid = confidence_trace_node_id
  ),
  CONSTRAINT recommendation_confidence_gate_output_identity CHECK (
    canonical_gate ->> 'policyVersion' = policy_version
    AND canonical_gate ->> 'confidenceVersion' = confidence_version
    AND canonical_gate ->> 'gateEngineVersion' = gate_engine_version
    AND (canonical_gate #>> '{confidence,index}')::numeric = confidence_index
    AND canonical_gate #>> '{confidence,state}' = confidence_state::text
    AND canonical_gate #>> '{confidence,caveat}' IS NOT DISTINCT FROM caveat
    AND canonical_gate #> '{confidence,limitationCodes}' = limitation_codes
    AND jsonb_typeof(canonical_gate -> 'candidates') = 'array'
  )
);

CREATE TABLE public.recommendation_candidate_confidence_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  candidate_evaluation_id uuid NOT NULL REFERENCES public.recommendation_candidate_evaluations(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  effort text NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  pre_gate_result public.recommendation_evaluation_result NOT NULL CHECK (pre_gate_result = 'eligible'),
  post_gate_result public.recommendation_confidence_gate_result NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'confidence_high',
    'confidence_moderate',
    'low_confidence_low_effort',
    'low_confidence_material_action',
    'low_confidence_evidence_first'
  )),
  confidence_state public.recommendation_confidence_state NOT NULL,
  caveat text,
  limitation_codes jsonb NOT NULL CHECK (jsonb_typeof(limitation_codes) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (jsonb_typeof(source_trace_node_ids) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (confidence_gate_id, candidate_evaluation_id),
  UNIQUE (confidence_gate_id, recommendation_id)
);

CREATE TABLE public.recommendation_confidence_gate_trace_links (
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  candidate_confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_candidate_confidence_gates(id) ON DELETE RESTRICT,
  trace_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  link_kind text NOT NULL CHECK (link_kind IN ('base_evidence', 'confidence_limitation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_confidence_gate_id, trace_node_id)
);

CREATE INDEX recommendation_confidence_gates_tenant_run_idx
  ON public.recommendation_confidence_gates (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_confidence_candidates_gate_state_idx
  ON public.recommendation_candidate_confidence_gates (
    confidence_gate_id, post_gate_result, catalogue_order
  );
CREATE INDEX recommendation_confidence_trace_scope_idx
  ON public.recommendation_confidence_gate_trace_links (
    organisation_id, workspace_id, analysis_run_id, confidence_gate_id
  );

CREATE TRIGGER recommendation_confidence_gates_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_confidence_gates
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_candidate_confidence_gates_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_candidate_confidence_gates
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_confidence_gate_trace_links_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_confidence_gate_trace_links
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_confidence_gate(p_input jsonb)
RETURNS public.recommendation_confidence_gates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_evaluation public.recommendation_evaluations;
  v_run public.assessment_analysis_runs;
  v_result public.delivery_intelligence_results;
  v_catalogue public.recommendation_catalogue_versions;
  v_confidence_trace public.delivery_intelligence_trace_nodes;
  v_gate public.recommendation_confidence_gates;
  v_candidate jsonb;
  v_candidate_evaluation public.recommendation_candidate_evaluations;
  v_definition public.recommendation_definitions;
  v_candidate_gate public.recommendation_candidate_confidence_gates;
  v_trace_id uuid;
  v_trace public.delivery_intelligence_trace_nodes;
  v_expected_count integer;
BEGIN
  IF p_input IS NULL
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_input -> 'candidates') <> 'array'
     OR p_input #> '{canonical_gate,candidates}' IS DISTINCT FROM p_input -> 'candidates' THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    (p_input ->> 'recommendation_evaluation_id') || ':' || (p_input ->> 'policy_version'),
    0
  ));

  SELECT * INTO v_gate
    FROM public.recommendation_confidence_gates
    WHERE recommendation_evaluation_id = (p_input ->> 'recommendation_evaluation_id')::uuid
      AND policy_version = p_input ->> 'policy_version';
  IF v_gate.id IS NOT NULL THEN
    IF v_gate.input_hash <> p_input ->> 'input_hash'
       OR v_gate.output_hash <> p_input ->> 'output_hash'
       OR v_gate.organisation_id <> (p_input ->> 'organisation_id')::uuid
       OR v_gate.workspace_id <> (p_input ->> 'workspace_id')::uuid THEN
      RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
    END IF;
    RETURN v_gate;
  END IF;

  SELECT * INTO v_evaluation FROM public.recommendation_evaluations
    WHERE id = (p_input ->> 'recommendation_evaluation_id')::uuid FOR SHARE;
  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_result FROM public.delivery_intelligence_results
    WHERE id = (p_input ->> 'intelligence_result_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;
  SELECT * INTO v_confidence_trace FROM public.delivery_intelligence_trace_nodes
    WHERE id = (p_input ->> 'confidence_trace_node_id')::uuid;

  IF v_evaluation.id IS NULL OR v_run.id IS NULL OR v_run.status <> 'completed'
     OR v_result.id IS NULL OR v_result.analysis_run_id <> v_run.id
     OR v_catalogue.id IS NULL
     OR v_evaluation.analysis_run_id <> v_run.id
     OR v_evaluation.intelligence_result_id <> v_result.id
     OR v_evaluation.catalogue_version_id <> v_catalogue.id
     OR v_evaluation.organisation_id <> v_run.organisation_id
     OR v_evaluation.workspace_id <> v_run.workspace_id
     OR v_result.organisation_id <> v_run.organisation_id
     OR v_result.workspace_id <> v_run.workspace_id
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest'
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR p_input #>> '{canonical_input,intelligenceResultHash}' <> v_result.result_hash
     OR p_input #>> '{canonical_input,recommendationEvaluationHash}' <> v_evaluation.output_hash
     OR v_confidence_trace.id IS NULL
     OR v_confidence_trace.analysis_run_id <> v_run.id
     OR v_confidence_trace.organisation_id <> v_run.organisation_id
     OR v_confidence_trace.workspace_id <> v_run.workspace_id
     OR v_confidence_trace.node_type <> 'confidence_result'
     OR v_confidence_trace.domain_id <> 'confidence' THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  SELECT count(*) INTO v_expected_count
    FROM public.recommendation_candidate_evaluations
    WHERE evaluation_id = v_evaluation.id AND result = 'eligible';
  IF jsonb_array_length(p_input -> 'candidates') <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  INSERT INTO public.recommendation_confidence_gates (
    recommendation_evaluation_id, analysis_run_id, intelligence_result_id,
    organisation_id, workspace_id, configuration_set_id, catalogue_version_id,
    catalogue_id, catalogue_version, catalogue_digest, policy_version,
    confidence_version, gate_engine_version, confidence_index, confidence_state,
    limitation_codes, caveat, confidence_trace_node_id, input_hash, output_hash,
    canonical_input, canonical_gate
  ) VALUES (
    v_evaluation.id, v_run.id, v_result.id, v_run.organisation_id, v_run.workspace_id,
    v_run.configuration_set_id, v_catalogue.id, v_catalogue.catalogue_id,
    v_catalogue.version, v_catalogue.content_digest, p_input ->> 'policy_version',
    p_input ->> 'confidence_version', p_input ->> 'gate_engine_version',
    (p_input ->> 'confidence_index')::numeric,
    (p_input ->> 'confidence_state')::public.recommendation_confidence_state,
    p_input -> 'limitation_codes', p_input ->> 'caveat', v_confidence_trace.id,
    p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_gate'
  ) RETURNING * INTO v_gate;

  FOR v_candidate IN SELECT value FROM jsonb_array_elements(p_input -> 'candidates') LOOP
    SELECT * INTO v_candidate_evaluation
      FROM public.recommendation_candidate_evaluations
      WHERE id = (v_candidate ->> 'candidateEvaluationId')::uuid;
    SELECT * INTO v_definition FROM public.recommendation_definitions
      WHERE id = (v_candidate ->> 'recommendationDefinitionId')::uuid;
    IF v_candidate_evaluation.id IS NULL
       OR v_candidate_evaluation.evaluation_id <> v_evaluation.id
       OR v_candidate_evaluation.result <> 'eligible'
       OR v_definition.id IS NULL
       OR v_definition.catalogue_version_id <> v_catalogue.id
       OR v_definition.id <> v_candidate_evaluation.recommendation_definition_id
       OR v_definition.recommendation_id <> v_candidate ->> 'recommendationId'
       OR v_definition.recommendation_version <> v_candidate ->> 'recommendationVersion'
       OR v_definition.catalogue_order <> (v_candidate ->> 'catalogueOrder')::integer
       OR v_definition.definition ->> 'effort' <> v_candidate ->> 'effort'
       OR v_candidate ->> 'preGateResult' <> 'eligible'
       OR v_candidate ->> 'postGateResult' NOT IN ('presented', 'withheld', 'evidence_first')
       OR v_candidate ->> 'confidenceState' <> p_input ->> 'confidence_state'
       OR (v_candidate ->> 'caveat') IS DISTINCT FROM (p_input ->> 'caveat')
       OR v_candidate -> 'limitationCodes' IS DISTINCT FROM p_input -> 'limitation_codes'
       OR v_candidate ->> 'semanticHash' !~ '^[0-9a-f]{64}$'
       OR jsonb_typeof(v_candidate -> 'sourceTraceNodeIds') <> 'array'
       OR NOT (v_candidate -> 'sourceTraceNodeIds' ? v_confidence_trace.id::text) THEN
      RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
    END IF;

    INSERT INTO public.recommendation_candidate_confidence_gates (
      confidence_gate_id, candidate_evaluation_id, analysis_run_id, organisation_id,
      workspace_id, recommendation_definition_id, recommendation_id,
      recommendation_version, catalogue_order, effort, pre_gate_result,
      post_gate_result, reason_code, confidence_state, caveat, limitation_codes,
      source_trace_node_ids, semantic_hash
    ) VALUES (
      v_gate.id, v_candidate_evaluation.id, v_run.id, v_run.organisation_id,
      v_run.workspace_id, v_definition.id, v_definition.recommendation_id,
      v_definition.recommendation_version, v_definition.catalogue_order,
      v_definition.definition ->> 'effort',
      'eligible',
      (v_candidate ->> 'postGateResult')::public.recommendation_confidence_gate_result,
      v_candidate ->> 'reasonCode',
      (v_candidate ->> 'confidenceState')::public.recommendation_confidence_state,
      v_candidate ->> 'caveat', v_candidate -> 'limitationCodes',
      v_candidate -> 'sourceTraceNodeIds', v_candidate ->> 'semanticHash'
    ) RETURNING * INTO v_candidate_gate;

    FOR v_trace_id IN SELECT (value #>> '{}')::uuid
      FROM jsonb_array_elements(v_candidate -> 'sourceTraceNodeIds') LOOP
      SELECT * INTO v_trace FROM public.delivery_intelligence_trace_nodes WHERE id = v_trace_id;
      IF v_trace.id IS NULL
         OR v_trace.analysis_run_id <> v_run.id
         OR v_trace.organisation_id <> v_run.organisation_id
         OR v_trace.workspace_id <> v_run.workspace_id
         OR (
           v_trace.id <> v_confidence_trace.id
           AND NOT EXISTS (
             SELECT 1 FROM public.recommendation_evaluation_trace_links link
             WHERE link.candidate_evaluation_id = v_candidate_evaluation.id
               AND link.trace_node_id = v_trace.id
           )
         ) THEN
        RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
      END IF;
      INSERT INTO public.recommendation_confidence_gate_trace_links (
        confidence_gate_id, candidate_confidence_gate_id, trace_node_id,
        analysis_run_id, organisation_id, workspace_id, link_kind
      ) VALUES (
        v_gate.id, v_candidate_gate.id, v_trace.id, v_run.id,
        v_run.organisation_id, v_run.workspace_id,
        CASE WHEN v_trace.id = v_confidence_trace.id
          THEN 'confidence_limitation' ELSE 'base_evidence' END
      );
    END LOOP;
  END LOOP;

  IF (SELECT count(*) FROM public.recommendation_candidate_confidence_gates
      WHERE confidence_gate_id = v_gate.id) <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;
  RETURN v_gate;
END;
$$;

ALTER TABLE public.recommendation_confidence_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_candidate_confidence_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_confidence_gate_trace_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_confidence_gates,
  public.recommendation_candidate_confidence_gates,
  public.recommendation_confidence_gate_trace_links FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_confidence_gate(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_confidence_gates,
  public.recommendation_candidate_confidence_gates,
  public.recommendation_confidence_gate_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_confidence_gate(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_confidence_gates IS
  'Immutable S4-003 confidence-gate snapshots over one pinned S4-002 evaluation.';