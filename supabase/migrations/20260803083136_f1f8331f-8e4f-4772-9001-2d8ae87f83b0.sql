CREATE TYPE public.recommendation_resolution_result AS ENUM ('canonical', 'suppressed');
CREATE TYPE public.recommendation_resolution_reason AS ENUM (
  'retained', 'mutual_exclusion', 'superseded', 'deduplicated'
);

CREATE TABLE public.recommendation_conflict_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  resolver_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_resolution jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (confidence_gate_id, policy_version),
  CONSTRAINT recommendation_conflict_resolution_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'recommendationEvaluationId' = recommendation_evaluation_id::text
    AND canonical_input ->> 'confidenceGateId' = confidence_gate_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_conflict_resolution_output CHECK (
    canonical_resolution ->> 'schemaVersion' = 'deliveryiq.recommendation-resolution/1.0.0'
    AND canonical_resolution ->> 'policyVersion' = policy_version
    AND canonical_resolution ->> 'resolverVersion' = resolver_version
    AND jsonb_typeof(canonical_resolution -> 'candidates') = 'array'
  )
);

CREATE TABLE public.recommendation_resolution_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  candidate_confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_candidate_confidence_gates(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  post_confidence_result public.recommendation_confidence_gate_result NOT NULL CHECK (
    post_confidence_result IN ('presented', 'evidence_first')
  ),
  resolution_result public.recommendation_resolution_result NOT NULL,
  reason_code public.recommendation_resolution_reason NOT NULL,
  winner_candidate_confidence_gate_id uuid REFERENCES public.recommendation_candidate_confidence_gates(id) ON DELETE RESTRICT,
  winner_recommendation_id text,
  winner_recommendation_version text CHECK (
    winner_recommendation_version IS NULL OR winner_recommendation_version ~ '^\d+\.\d+\.\d+$'
  ),
  source_candidate_gate_ids jsonb NOT NULL CHECK (jsonb_typeof(source_candidate_gate_ids) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (jsonb_typeof(source_trace_node_ids) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resolution_id, candidate_confidence_gate_id),
  UNIQUE (resolution_id, recommendation_id),
  CONSTRAINT recommendation_resolution_candidate_terminal CHECK (
    (
      resolution_result = 'canonical'
      AND reason_code = 'retained'
      AND winner_candidate_confidence_gate_id IS NULL
      AND winner_recommendation_id IS NULL
      AND winner_recommendation_version IS NULL
    )
    OR (
      resolution_result = 'suppressed'
      AND reason_code <> 'retained'
      AND winner_candidate_confidence_gate_id IS NOT NULL
      AND winner_recommendation_id IS NOT NULL
      AND winner_recommendation_version IS NOT NULL
    )
  )
);

CREATE TABLE public.recommendation_resolution_trace_links (
  resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  resolution_candidate_id uuid NOT NULL REFERENCES public.recommendation_resolution_candidates(id) ON DELETE RESTRICT,
  source_candidate_confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_candidate_confidence_gates(id) ON DELETE RESTRICT,
  trace_node_id uuid NOT NULL REFERENCES public.delivery_intelligence_trace_nodes(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  link_kind text NOT NULL CHECK (link_kind IN ('self_evidence', 'deduplicated_evidence')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resolution_candidate_id, source_candidate_confidence_gate_id, trace_node_id)
);

CREATE INDEX recommendation_conflict_resolutions_tenant_run_idx
  ON public.recommendation_conflict_resolutions (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_resolution_candidates_result_idx
  ON public.recommendation_resolution_candidates (
    resolution_id, resolution_result, catalogue_order
  );
CREATE INDEX recommendation_resolution_trace_scope_idx
  ON public.recommendation_resolution_trace_links (
    organisation_id, workspace_id, analysis_run_id, resolution_id
  );

CREATE TRIGGER recommendation_conflict_resolutions_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_conflict_resolutions
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_resolution_candidates_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_resolution_candidates
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_resolution_trace_links_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_resolution_trace_links
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_conflict_resolution(p_input jsonb)
RETURNS public.recommendation_conflict_resolutions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_gate public.recommendation_confidence_gates;
  v_evaluation public.recommendation_evaluations;
  v_run public.assessment_analysis_runs;
  v_catalogue public.recommendation_catalogue_versions;
  v_resolution public.recommendation_conflict_resolutions;
  v_candidate jsonb;
  v_gate_candidate public.recommendation_candidate_confidence_gates;
  v_definition public.recommendation_definitions;
  v_winner_candidate public.recommendation_candidate_confidence_gates;
  v_winner_definition public.recommendation_definitions;
  v_resolution_candidate public.recommendation_resolution_candidates;
  v_source_candidate_id uuid;
  v_source_candidate public.recommendation_candidate_confidence_gates;
  v_trace_id uuid;
  v_trace public.delivery_intelligence_trace_nodes;
  v_expected_trace_ids jsonb;
  v_expected_count integer;
BEGIN
  IF p_input IS NULL
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_input -> 'candidates') <> 'array'
     OR p_input #> '{canonical_resolution,candidates}' IS DISTINCT FROM p_input -> 'candidates' THEN
    RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    (p_input ->> 'confidence_gate_id') || ':' || (p_input ->> 'policy_version'), 0
  ));

  SELECT * INTO v_resolution
    FROM public.recommendation_conflict_resolutions
    WHERE confidence_gate_id = (p_input ->> 'confidence_gate_id')::uuid
      AND policy_version = p_input ->> 'policy_version';
  IF v_resolution.id IS NOT NULL THEN
    IF v_resolution.input_hash <> p_input ->> 'input_hash'
       OR v_resolution.output_hash <> p_input ->> 'output_hash'
       OR v_resolution.organisation_id <> (p_input ->> 'organisation_id')::uuid
       OR v_resolution.workspace_id <> (p_input ->> 'workspace_id')::uuid THEN
      RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
    END IF;
    RETURN v_resolution;
  END IF;

  SELECT * INTO v_gate FROM public.recommendation_confidence_gates
    WHERE id = (p_input ->> 'confidence_gate_id')::uuid FOR SHARE;
  SELECT * INTO v_evaluation FROM public.recommendation_evaluations
    WHERE id = (p_input ->> 'recommendation_evaluation_id')::uuid FOR SHARE;
  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;

  IF v_gate.id IS NULL OR v_evaluation.id IS NULL OR v_run.id IS NULL
     OR v_run.status <> 'completed' OR v_catalogue.id IS NULL
     OR v_gate.analysis_run_id <> v_run.id
     OR v_gate.recommendation_evaluation_id <> v_evaluation.id
     OR v_gate.organisation_id <> v_run.organisation_id
     OR v_gate.workspace_id <> v_run.workspace_id
     OR v_evaluation.analysis_run_id <> v_run.id
     OR v_evaluation.organisation_id <> v_run.organisation_id
     OR v_evaluation.workspace_id <> v_run.workspace_id
     OR v_gate.catalogue_version_id <> v_catalogue.id
     OR v_gate.catalogue_digest <> v_catalogue.content_digest
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest'
     OR p_input #>> '{canonical_input,confidenceGateHash}' <> v_gate.output_hash THEN
    RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
  END IF;

  SELECT count(*) INTO v_expected_count
    FROM public.recommendation_candidate_confidence_gates
    WHERE confidence_gate_id = v_gate.id AND post_gate_result <> 'withheld';
  IF jsonb_array_length(p_input -> 'candidates') <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
  END IF;

  INSERT INTO public.recommendation_conflict_resolutions (
    analysis_run_id, recommendation_evaluation_id, confidence_gate_id,
    organisation_id, workspace_id, configuration_set_id, catalogue_version_id,
    catalogue_id, catalogue_version, catalogue_digest, policy_version,
    resolver_version, input_hash, output_hash, canonical_input, canonical_resolution
  ) VALUES (
    v_run.id, v_evaluation.id, v_gate.id, v_run.organisation_id, v_run.workspace_id,
    v_run.configuration_set_id, v_catalogue.id, v_catalogue.catalogue_id,
    v_catalogue.version, v_catalogue.content_digest, p_input ->> 'policy_version',
    p_input ->> 'resolver_version', p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_resolution'
  ) RETURNING * INTO v_resolution;

  FOR v_candidate IN SELECT value FROM jsonb_array_elements(p_input -> 'candidates') LOOP
    SELECT * INTO v_gate_candidate
      FROM public.recommendation_candidate_confidence_gates
      WHERE id = (v_candidate ->> 'candidateConfidenceGateId')::uuid;
    SELECT * INTO v_definition FROM public.recommendation_definitions
      WHERE id = (v_candidate ->> 'recommendationDefinitionId')::uuid;

    IF v_gate_candidate.id IS NULL
       OR v_gate_candidate.confidence_gate_id <> v_gate.id
       OR v_gate_candidate.post_gate_result = 'withheld'
       OR v_definition.id IS NULL
       OR v_definition.catalogue_version_id <> v_catalogue.id
       OR v_definition.id <> v_gate_candidate.recommendation_definition_id
       OR v_definition.recommendation_id <> v_candidate ->> 'recommendationId'
       OR v_definition.recommendation_version <> v_candidate ->> 'recommendationVersion'
       OR v_definition.catalogue_order <> (v_candidate ->> 'catalogueOrder')::integer
       OR v_gate_candidate.post_gate_result::text <> v_candidate ->> 'postConfidenceResult'
       OR v_candidate ->> 'resolutionResult' NOT IN ('canonical', 'suppressed')
       OR v_candidate ->> 'reasonCode' NOT IN (
         'retained', 'mutual_exclusion', 'superseded', 'deduplicated'
       )
       OR jsonb_typeof(v_candidate -> 'sourceCandidateGateIds') <> 'array'
       OR jsonb_typeof(v_candidate -> 'sourceTraceNodeIds') <> 'array'
       OR v_candidate ->> 'semanticHash' !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
    END IF;

    v_winner_candidate := NULL;
    v_winner_definition := NULL;
    IF v_candidate ->> 'resolutionResult' = 'suppressed' THEN
      SELECT * INTO v_winner_candidate
        FROM public.recommendation_candidate_confidence_gates
        WHERE confidence_gate_id = v_gate.id
          AND recommendation_id = v_candidate ->> 'winnerRecommendationId'
          AND recommendation_version = v_candidate ->> 'winnerRecommendationVersion'
          AND post_gate_result <> 'withheld';
      SELECT * INTO v_winner_definition FROM public.recommendation_definitions
        WHERE id = v_winner_candidate.recommendation_definition_id;
      IF v_winner_candidate.id IS NULL OR v_winner_definition.id IS NULL
         OR v_winner_candidate.id = v_gate_candidate.id
         OR EXISTS (
           SELECT 1 FROM public.recommendation_dependency_mappings dependency
           WHERE dependency.catalogue_version_id = v_catalogue.id
             AND dependency.recommendation_id = v_winner_candidate.recommendation_id
             AND dependency.dependency_id = v_gate_candidate.recommendation_id
         )
         OR (
           v_candidate ->> 'reasonCode' = 'mutual_exclusion'
           AND NOT (
             EXISTS (
               SELECT 1 FROM public.recommendation_conflict_mappings conflict
               WHERE conflict.catalogue_version_id = v_catalogue.id
                 AND conflict.recommendation_id = v_winner_candidate.recommendation_id
                 AND conflict.conflicting_recommendation_id = v_gate_candidate.recommendation_id
             )
             AND EXISTS (
               SELECT 1 FROM public.recommendation_conflict_mappings conflict
               WHERE conflict.catalogue_version_id = v_catalogue.id
                 AND conflict.recommendation_id = v_gate_candidate.recommendation_id
                 AND conflict.conflicting_recommendation_id = v_winner_candidate.recommendation_id
             )
           )
         )
         OR (
           v_candidate ->> 'reasonCode' = 'mutual_exclusion'
           AND (
             v_winner_definition.definition ->> 'conflictPriority' IS NULL
             OR v_definition.definition ->> 'conflictPriority' IS NULL
             OR NOT (
               (v_winner_definition.definition ->> 'conflictPriority')::integer >
                 (v_definition.definition ->> 'conflictPriority')::integer
               OR (
                 (v_winner_definition.definition ->> 'conflictPriority')::integer =
                   (v_definition.definition ->> 'conflictPriority')::integer
                 AND (
                   v_winner_definition.catalogue_order < v_definition.catalogue_order
                   OR (
                     v_winner_definition.catalogue_order = v_definition.catalogue_order
                     AND v_winner_definition.recommendation_id < v_definition.recommendation_id
                   )
                 )
               )
             )
           )
         )
         OR (
           v_candidate ->> 'reasonCode' = 'superseded'
           AND NOT COALESCE(
             v_winner_definition.definition -> 'supersedes' @>
               jsonb_build_array(jsonb_build_object(
                 'id', v_gate_candidate.recommendation_id,
                 'version', v_gate_candidate.recommendation_version
               )),
             false
           )
         )
         OR (
           v_candidate ->> 'reasonCode' = 'deduplicated'
           AND (
             v_winner_definition.definition ->> 'dedupeGroup'
               IS DISTINCT FROM v_definition.definition ->> 'dedupeGroup'
             OR (
               EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements(v_catalogue.snapshot -> 'definitions')
                   AS catalogue_item(value)
                 WHERE catalogue_item.value ->> 'dedupeGroup' =
                     v_definition.definition ->> 'dedupeGroup'
                   AND catalogue_item.value ? 'canonicalRecommendation'
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements(v_catalogue.snapshot -> 'definitions')
                   AS catalogue_item(value)
                 WHERE catalogue_item.value ->> 'dedupeGroup' =
                     v_definition.definition ->> 'dedupeGroup'
                   AND catalogue_item.value #>> '{canonicalRecommendation,id}' =
                     v_winner_definition.recommendation_id
                   AND catalogue_item.value #>> '{canonicalRecommendation,version}' =
                     v_winner_definition.recommendation_version
               )
             )
             OR (
               NOT EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements(v_catalogue.snapshot -> 'definitions')
                   AS catalogue_item(value)
                 WHERE catalogue_item.value ->> 'dedupeGroup' =
                     v_definition.definition ->> 'dedupeGroup'
                   AND catalogue_item.value ? 'canonicalRecommendation'
               )
               AND (
                 v_winner_definition.catalogue_order > v_definition.catalogue_order
                 OR (
                   v_winner_definition.catalogue_order = v_definition.catalogue_order
                   AND v_winner_definition.recommendation_id > v_definition.recommendation_id
                 )
               )
             )
           )
         ) THEN
        RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
      END IF;
    ELSIF v_candidate ->> 'reasonCode' <> 'retained'
       OR v_candidate ->> 'winnerRecommendationId' IS NOT NULL
       OR v_candidate ->> 'winnerRecommendationVersion' IS NOT NULL THEN
      RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
    END IF;

    SELECT COALESCE(jsonb_agg(trace_id ORDER BY trace_id), '[]'::jsonb)
      INTO v_expected_trace_ids
      FROM (
        SELECT DISTINCT trace.value #>> '{}' AS trace_id
        FROM public.recommendation_candidate_confidence_gates source,
          jsonb_array_elements(source.source_trace_node_ids) trace
        WHERE source.confidence_gate_id = v_gate.id
          AND source.id IN (
            SELECT (value #>> '{}')::uuid
            FROM jsonb_array_elements(v_candidate -> 'sourceCandidateGateIds')
          )
      ) expected;
    IF v_candidate -> 'sourceTraceNodeIds' IS DISTINCT FROM v_expected_trace_ids
       OR NOT (v_candidate -> 'sourceCandidateGateIds' ? v_gate_candidate.id::text) THEN
      RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
    END IF;

    INSERT INTO public.recommendation_resolution_candidates (
      resolution_id, candidate_confidence_gate_id, analysis_run_id,
      organisation_id, workspace_id, recommendation_definition_id,
      recommendation_id, recommendation_version, catalogue_order,
      post_confidence_result, resolution_result, reason_code,
      winner_candidate_confidence_gate_id, winner_recommendation_id,
      winner_recommendation_version, source_candidate_gate_ids,
      source_trace_node_ids, semantic_hash
    ) VALUES (
      v_resolution.id, v_gate_candidate.id, v_run.id, v_run.organisation_id,
      v_run.workspace_id, v_definition.id, v_definition.recommendation_id,
      v_definition.recommendation_version, v_definition.catalogue_order,
      v_gate_candidate.post_gate_result,
      (v_candidate ->> 'resolutionResult')::public.recommendation_resolution_result,
      (v_candidate ->> 'reasonCode')::public.recommendation_resolution_reason,
      v_winner_candidate.id, v_candidate ->> 'winnerRecommendationId',
      v_candidate ->> 'winnerRecommendationVersion',
      v_candidate -> 'sourceCandidateGateIds', v_candidate -> 'sourceTraceNodeIds',
      v_candidate ->> 'semanticHash'
    ) RETURNING * INTO v_resolution_candidate;

    FOR v_source_candidate_id IN
      SELECT (value #>> '{}')::uuid
      FROM jsonb_array_elements(v_candidate -> 'sourceCandidateGateIds')
    LOOP
      SELECT * INTO v_source_candidate
        FROM public.recommendation_candidate_confidence_gates
        WHERE id = v_source_candidate_id AND confidence_gate_id = v_gate.id;
      IF v_source_candidate.id IS NULL
         OR (
           v_source_candidate.id <> v_gate_candidate.id
           AND (
             v_candidate ->> 'resolutionResult' <> 'canonical'
             OR NOT EXISTS (
               SELECT 1
               FROM jsonb_array_elements(p_input -> 'candidates') AS related(value)
               WHERE related.value ->> 'candidateConfidenceGateId' = v_source_candidate.id::text
                 AND related.value ->> 'resolutionResult' = 'suppressed'
                 AND related.value ->> 'reasonCode' = 'deduplicated'
                 AND related.value ->> 'winnerRecommendationId' = v_gate_candidate.recommendation_id
             )
           )
         ) THEN
        RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
      END IF;
      FOR v_trace_id IN
        SELECT (value #>> '{}')::uuid
        FROM jsonb_array_elements(v_source_candidate.source_trace_node_ids)
      LOOP
        SELECT * INTO v_trace FROM public.delivery_intelligence_trace_nodes
          WHERE id = v_trace_id;
        IF v_trace.id IS NULL
           OR v_trace.analysis_run_id <> v_run.id
           OR v_trace.organisation_id <> v_run.organisation_id
           OR v_trace.workspace_id <> v_run.workspace_id THEN
          RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
        END IF;
        INSERT INTO public.recommendation_resolution_trace_links (
          resolution_id, resolution_candidate_id, source_candidate_confidence_gate_id,
          trace_node_id, analysis_run_id, organisation_id, workspace_id, link_kind
        ) VALUES (
          v_resolution.id, v_resolution_candidate.id, v_source_candidate.id, v_trace.id,
          v_run.id, v_run.organisation_id, v_run.workspace_id,
          CASE WHEN v_source_candidate.id = v_gate_candidate.id
            THEN 'self_evidence' ELSE 'deduplicated_evidence' END
        );
      END LOOP;
    END LOOP;
  END LOOP;

  IF (SELECT count(*) FROM public.recommendation_resolution_candidates
      WHERE resolution_id = v_resolution.id) <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_RESOLUTION_INVALID';
  END IF;
  RETURN v_resolution;
END;
$$;

ALTER TABLE public.recommendation_conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_resolution_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_resolution_trace_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_conflict_resolutions,
  public.recommendation_resolution_candidates,
  public.recommendation_resolution_trace_links FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_conflict_resolution(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_conflict_resolutions,
  public.recommendation_resolution_candidates,
  public.recommendation_resolution_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_conflict_resolution(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_conflict_resolutions IS
  'Immutable S4-004 conflict and deduplication snapshots over one S4-003 gate.';