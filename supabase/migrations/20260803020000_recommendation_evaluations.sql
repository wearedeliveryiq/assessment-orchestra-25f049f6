CREATE TYPE public.recommendation_evaluation_result AS ENUM ('eligible', 'ineligible', 'excluded');
CREATE TYPE public.recommendation_confidence_state AS ENUM ('low', 'moderate', 'high');

CREATE TABLE public.recommendation_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  evaluator_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_evaluation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_run_id, catalogue_version_id, policy_version),
  CONSTRAINT recommendation_evaluation_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'intelligenceResultId' = intelligence_result_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_evaluation_output_identity CHECK (
    canonical_evaluation ->> 'policyVersion' = policy_version
    AND canonical_evaluation ->> 'evaluatorVersion' = evaluator_version
    AND canonical_evaluation ->> 'catalogueId' = catalogue_id
    AND canonical_evaluation ->> 'catalogueVersion' = catalogue_version
    AND jsonb_typeof(canonical_evaluation -> 'candidates') = 'array'
  )
);

CREATE TABLE public.recommendation_candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  result public.recommendation_evaluation_result NOT NULL,
  matched_triggers jsonb NOT NULL CHECK (jsonb_typeof(matched_triggers) = 'array'),
  unmet_triggers jsonb NOT NULL CHECK (jsonb_typeof(unmet_triggers) = 'array'),
  unmet_prerequisites jsonb NOT NULL CHECK (jsonb_typeof(unmet_prerequisites) = 'array'),
  exclusions jsonb NOT NULL CHECK (jsonb_typeof(exclusions) = 'array'),
  confidence_state public.recommendation_confidence_state NOT NULL,
  decisive_facts jsonb NOT NULL CHECK (jsonb_typeof(decisive_facts) = 'array'),
  source_domain_ids jsonb NOT NULL CHECK (jsonb_typeof(source_domain_ids) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (jsonb_typeof(source_trace_node_ids) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, recommendation_id)
);

CREATE TABLE public.recommendation_evaluation_trace_links (
  evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  candidate_evaluation_id uuid NOT NULL REFERENCES public.recommendation_candidate_evaluations(id) ON DELETE RESTRICT,
  trace_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_evaluation_id, trace_node_id)
);

CREATE INDEX recommendation_evaluations_tenant_run_idx
  ON public.recommendation_evaluations (organisation_id, workspace_id, analysis_run_id, created_at DESC);
CREATE INDEX recommendation_candidates_tenant_evaluation_idx
  ON public.recommendation_candidate_evaluations (organisation_id, workspace_id, evaluation_id, catalogue_order);
CREATE INDEX recommendation_candidates_result_idx
  ON public.recommendation_candidate_evaluations (evaluation_id, result, catalogue_order);
CREATE INDEX recommendation_evaluation_trace_scope_idx
  ON public.recommendation_evaluation_trace_links (organisation_id, workspace_id, analysis_run_id, evaluation_id);

CREATE TRIGGER recommendation_evaluations_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_evaluations
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_candidate_evaluations_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_candidate_evaluations
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_evaluation_trace_links_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_evaluation_trace_links
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_evaluation(p_input jsonb)
RETURNS public.recommendation_evaluations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_run public.assessment_analysis_runs;
  v_result public.delivery_intelligence_results;
  v_catalogue public.recommendation_catalogue_versions;
  v_evaluation public.recommendation_evaluations;
  v_candidate jsonb;
  v_definition public.recommendation_definitions;
  v_candidate_row public.recommendation_candidate_evaluations;
  v_trace_id uuid;
  v_trace public.delivery_intelligence_trace_nodes;
  v_expected_count integer;
BEGIN
  IF p_input IS NULL
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_input -> 'candidates') <> 'array'
     OR p_input #> '{canonical_evaluation,candidates}' IS DISTINCT FROM p_input -> 'candidates' THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    (p_input ->> 'analysis_run_id') || ':' || (p_input ->> 'catalogue_version_id') || ':' || (p_input ->> 'policy_version'),
    0
  ));

  SELECT * INTO v_evaluation
    FROM public.recommendation_evaluations
    WHERE analysis_run_id = (p_input ->> 'analysis_run_id')::uuid
      AND catalogue_version_id = (p_input ->> 'catalogue_version_id')::uuid
      AND policy_version = p_input ->> 'policy_version';
  IF v_evaluation.id IS NOT NULL THEN
    IF v_evaluation.input_hash <> p_input ->> 'input_hash'
       OR v_evaluation.output_hash <> p_input ->> 'output_hash'
       OR v_evaluation.intelligence_result_id <> (p_input ->> 'intelligence_result_id')::uuid
       OR v_evaluation.organisation_id <> (p_input ->> 'organisation_id')::uuid
       OR v_evaluation.workspace_id <> (p_input ->> 'workspace_id')::uuid THEN
      RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
    END IF;
    RETURN v_evaluation;
  END IF;

  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_result FROM public.delivery_intelligence_results
    WHERE id = (p_input ->> 'intelligence_result_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;

  IF v_run.id IS NULL OR v_run.status <> 'completed'
     OR v_result.id IS NULL OR v_result.analysis_run_id <> v_run.id
     OR v_result.organisation_id <> v_run.organisation_id
     OR v_result.workspace_id <> v_run.workspace_id
     OR v_catalogue.id IS NULL OR v_catalogue.current_state <> 'active'
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest'
     OR v_catalogue.source_configuration_set_id <> v_run.configuration_set_id
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR NOT EXISTS (
       SELECT 1 FROM public.recommendation_catalogue_activations activation
       WHERE activation.environment = 'production'
         AND activation.catalogue_version_id = v_catalogue.id
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  SELECT count(*) INTO v_expected_count FROM public.recommendation_definitions
    WHERE catalogue_version_id = v_catalogue.id;
  IF jsonb_array_length(p_input -> 'candidates') <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;
  IF (SELECT count(*) FROM public.recommendation_catalogue_activations
      WHERE environment = 'production' AND catalogue_version_id = v_catalogue.id) <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;

  INSERT INTO public.recommendation_evaluations (
    analysis_run_id, intelligence_result_id, organisation_id, workspace_id,
    configuration_set_id, catalogue_version_id, catalogue_id, catalogue_version,
    catalogue_digest, policy_version, evaluator_version, input_hash, output_hash,
    canonical_input, canonical_evaluation
  ) VALUES (
    v_run.id, v_result.id, v_run.organisation_id, v_run.workspace_id,
    v_run.configuration_set_id, v_catalogue.id, v_catalogue.catalogue_id, v_catalogue.version,
    v_catalogue.content_digest, p_input ->> 'policy_version', p_input ->> 'evaluator_version',
    p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_evaluation'
  ) RETURNING * INTO v_evaluation;

  FOR v_candidate IN SELECT value FROM jsonb_array_elements(p_input -> 'candidates') LOOP
    SELECT * INTO v_definition FROM public.recommendation_definitions
      WHERE catalogue_version_id = v_catalogue.id
        AND recommendation_id = v_candidate ->> 'recommendationId';
    IF v_definition.id IS NULL
       OR v_definition.recommendation_version <> v_candidate ->> 'recommendationVersion'
       OR v_definition.catalogue_order <> (v_candidate ->> 'catalogueOrder')::integer
       OR v_candidate ->> 'result' NOT IN ('eligible', 'ineligible', 'excluded')
       OR v_candidate ->> 'confidenceState' NOT IN ('low', 'moderate', 'high') THEN
      RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
    END IF;

    INSERT INTO public.recommendation_candidate_evaluations (
      evaluation_id, analysis_run_id, organisation_id, workspace_id,
      recommendation_definition_id, recommendation_id, recommendation_version,
      catalogue_order, result, matched_triggers, unmet_triggers, unmet_prerequisites,
      exclusions, confidence_state, decisive_facts, source_domain_ids,
      source_trace_node_ids, semantic_hash
    ) VALUES (
      v_evaluation.id, v_run.id, v_run.organisation_id, v_run.workspace_id,
      v_definition.id, v_definition.recommendation_id, v_definition.recommendation_version,
      v_definition.catalogue_order, (v_candidate ->> 'result')::public.recommendation_evaluation_result,
      v_candidate -> 'matchedTriggers', v_candidate -> 'unmetTriggers',
      v_candidate -> 'unmetPrerequisites', v_candidate -> 'exclusions',
      (v_candidate ->> 'confidenceState')::public.recommendation_confidence_state,
      v_candidate -> 'decisiveFacts', v_candidate -> 'sourceDomainIds',
      v_candidate -> 'sourceTraceNodeIds', v_candidate ->> 'semanticHash'
    ) RETURNING * INTO v_candidate_row;

    FOR v_trace_id IN SELECT (value #>> '{}')::uuid
      FROM jsonb_array_elements(v_candidate -> 'sourceTraceNodeIds') LOOP
      SELECT * INTO v_trace FROM public.delivery_intelligence_trace_nodes WHERE id = v_trace_id;
      IF v_trace.id IS NULL OR v_trace.analysis_run_id <> v_run.id
         OR v_trace.organisation_id <> v_run.organisation_id
         OR v_trace.workspace_id <> v_run.workspace_id
         OR NOT (v_candidate -> 'sourceDomainIds' ? v_trace.domain_id) THEN
        RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
      END IF;
      INSERT INTO public.recommendation_evaluation_trace_links (
        evaluation_id, candidate_evaluation_id, trace_node_id,
        analysis_run_id, organisation_id, workspace_id
      ) VALUES (
        v_evaluation.id, v_candidate_row.id, v_trace.id,
        v_run.id, v_run.organisation_id, v_run.workspace_id
      );
    END LOOP;
  END LOOP;

  IF (SELECT count(*) FROM public.recommendation_candidate_evaluations
      WHERE evaluation_id = v_evaluation.id) <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_EVALUATION_INVALID';
  END IF;
  RETURN v_evaluation;
END;
$$;

ALTER TABLE public.recommendation_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_candidate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_evaluation_trace_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_evaluations,
  public.recommendation_candidate_evaluations,
  public.recommendation_evaluation_trace_links FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_evaluation(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_evaluations,
  public.recommendation_candidate_evaluations,
  public.recommendation_evaluation_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_evaluation(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_evaluations IS
  'Immutable S4-002 evaluation snapshots pinned to one analysis result and active catalogue version.';
