CREATE TYPE public.recommendation_priority_label AS ENUM (
  'critical', 'high', 'medium', 'low'
);

CREATE TABLE public.recommendation_priority_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  intelligence_result_id uuid NOT NULL REFERENCES public.delivery_intelligence_results(id) ON DELETE RESTRICT,
  recommendation_evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  conflict_resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  model_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_priority jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conflict_resolution_id, policy_version),
  CONSTRAINT recommendation_priority_model_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'intelligenceResultId' = intelligence_result_id::text
    AND canonical_input ->> 'recommendationEvaluationId' = recommendation_evaluation_id::text
    AND canonical_input ->> 'confidenceGateId' = confidence_gate_id::text
    AND canonical_input ->> 'conflictResolutionId' = conflict_resolution_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_priority_model_output CHECK (
    canonical_priority ->> 'schemaVersion' = 'deliveryiq.recommendation-priority/1.0.0'
    AND canonical_priority ->> 'policyVersion' = policy_version
    AND canonical_priority ->> 'modelVersion' = model_version
    AND jsonb_typeof(canonical_priority -> 'items') = 'array'
  )
);

CREATE TABLE public.recommendation_priority_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_model_id uuid NOT NULL REFERENCES public.recommendation_priority_models(id) ON DELETE RESTRICT,
  resolution_candidate_id uuid NOT NULL REFERENCES public.recommendation_resolution_candidates(id) ON DELETE RESTRICT,
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
  generated_rank integer NOT NULL CHECK (generated_rank > 0),
  priority_label public.recommendation_priority_label NOT NULL,
  impact text NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  effort text NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  raw_rank_score numeric(18,9) NOT NULL CHECK (raw_rank_score BETWEEN 0 AND 100),
  components jsonb NOT NULL CHECK (jsonb_typeof(components) = 'object'),
  component_weights jsonb NOT NULL CHECK (jsonb_typeof(component_weights) = 'object'),
  rationale jsonb NOT NULL CHECK (jsonb_typeof(rationale) = 'array'),
  source_recommendation_ids jsonb NOT NULL CHECK (jsonb_typeof(source_recommendation_ids) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (jsonb_typeof(source_trace_node_ids) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (priority_model_id, resolution_candidate_id),
  UNIQUE (priority_model_id, recommendation_id),
  UNIQUE (priority_model_id, generated_rank)
);

CREATE TABLE public.recommendation_priority_display_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_model_id uuid NOT NULL REFERENCES public.recommendation_priority_models(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  previous_preference_id uuid REFERENCES public.recommendation_priority_display_preferences(id) ON DELETE RESTRICT,
  ordered_recommendation_ids jsonb NOT NULL CHECK (jsonb_typeof(ordered_recommendation_ids) = 'array'),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (priority_model_id, version),
  UNIQUE (organisation_id, workspace_id, idempotency_key)
);

CREATE INDEX recommendation_priority_models_tenant_run_idx
  ON public.recommendation_priority_models (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_priority_items_order_idx
  ON public.recommendation_priority_items (priority_model_id, generated_rank);
CREATE INDEX recommendation_priority_preferences_current_idx
  ON public.recommendation_priority_display_preferences (
    organisation_id, workspace_id, priority_model_id, version DESC
  );

CREATE TRIGGER recommendation_priority_models_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_priority_models
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_priority_items_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_priority_items
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_priority_preferences_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_priority_display_preferences
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_priority_model(p_input jsonb)
RETURNS public.recommendation_priority_models
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_run public.assessment_analysis_runs;
  v_result public.delivery_intelligence_results;
  v_gate public.recommendation_confidence_gates;
  v_resolution public.recommendation_conflict_resolutions;
  v_catalogue public.recommendation_catalogue_versions;
  v_model public.recommendation_priority_models;
  v_item jsonb;
  v_resolution_candidate public.recommendation_resolution_candidates;
  v_definition public.recommendation_definitions;
  v_expected_count integer;
  v_source_count integer;
  v_trace_count integer;
  v_expected_source_ids jsonb;
  v_expected_trace_ids jsonb;
  v_source_rank jsonb;
  v_canonical_rank jsonb;
  v_expected_impact numeric;
  v_expected_impact_band text;
  v_expected_urgency numeric;
  v_expected_effort_ease numeric;
  v_expected_score numeric;
  v_expected_label text;
  v_weights jsonb;
BEGIN
  IF p_input IS NULL
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_input -> 'items') <> 'array'
     OR p_input #> '{canonical_priority,items}' IS DISTINCT FROM p_input -> 'items' THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    (p_input ->> 'conflict_resolution_id') || ':' || (p_input ->> 'policy_version'), 0
  ));

  SELECT * INTO v_model
    FROM public.recommendation_priority_models
    WHERE conflict_resolution_id = (p_input ->> 'conflict_resolution_id')::uuid
      AND policy_version = p_input ->> 'policy_version';
  IF v_model.id IS NOT NULL THEN
    IF v_model.input_hash <> p_input ->> 'input_hash'
       OR v_model.output_hash <> p_input ->> 'output_hash'
       OR v_model.organisation_id <> (p_input ->> 'organisation_id')::uuid
       OR v_model.workspace_id <> (p_input ->> 'workspace_id')::uuid THEN
      RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
    END IF;
    RETURN v_model;
  END IF;

  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_result FROM public.delivery_intelligence_results
    WHERE id = (p_input ->> 'intelligence_result_id')::uuid FOR SHARE;
  SELECT * INTO v_gate FROM public.recommendation_confidence_gates
    WHERE id = (p_input ->> 'confidence_gate_id')::uuid FOR SHARE;
  SELECT * INTO v_resolution FROM public.recommendation_conflict_resolutions
    WHERE id = (p_input ->> 'conflict_resolution_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;
  v_weights := v_run.configuration_snapshot #> '{recommendationPolicy,rankFormula}';

  IF v_run.id IS NULL OR v_run.status <> 'completed'
     OR v_result.id IS NULL OR v_result.analysis_run_id <> v_run.id
     OR v_gate.id IS NULL OR v_gate.analysis_run_id <> v_run.id
     OR v_resolution.id IS NULL OR v_resolution.analysis_run_id <> v_run.id
     OR v_resolution.confidence_gate_id <> v_gate.id
     OR v_resolution.recommendation_evaluation_id <> v_gate.recommendation_evaluation_id
     OR v_catalogue.id IS NULL OR v_resolution.catalogue_version_id <> v_catalogue.id
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_result.organisation_id <> v_run.organisation_id
     OR v_result.workspace_id <> v_run.workspace_id
     OR v_gate.organisation_id <> v_run.organisation_id
     OR v_gate.workspace_id <> v_run.workspace_id
     OR v_resolution.organisation_id <> v_run.organisation_id
     OR v_resolution.workspace_id <> v_run.workspace_id
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest'
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR p_input #>> '{canonical_input,intelligenceResultHash}' <> v_result.result_hash
     OR p_input #>> '{canonical_input,conflictResolutionHash}' <> v_resolution.output_hash
     OR (p_input #>> '{canonical_input,analysisConfidence}')::numeric <> v_gate.confidence_index
     OR jsonb_typeof(v_weights) <> 'object' THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;

  SELECT count(*) INTO v_expected_count
    FROM public.recommendation_resolution_candidates
    WHERE resolution_id = v_resolution.id AND resolution_result = 'canonical';
  IF jsonb_array_length(p_input -> 'items') <> v_expected_count THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;

  INSERT INTO public.recommendation_priority_models (
    analysis_run_id, intelligence_result_id, recommendation_evaluation_id,
    confidence_gate_id, conflict_resolution_id, organisation_id, workspace_id,
    configuration_set_id, catalogue_version_id, catalogue_id, catalogue_version,
    catalogue_digest, policy_version, model_version, input_hash, output_hash,
    canonical_input, canonical_priority
  ) VALUES (
    v_run.id, v_result.id, v_gate.recommendation_evaluation_id, v_gate.id,
    v_resolution.id, v_run.organisation_id, v_run.workspace_id,
    v_run.configuration_set_id, v_catalogue.id, v_catalogue.catalogue_id,
    v_catalogue.version, v_catalogue.content_digest, p_input ->> 'policy_version',
    p_input ->> 'model_version', p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_priority'
  ) RETURNING * INTO v_model;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input -> 'items') LOOP
    SELECT * INTO v_resolution_candidate
      FROM public.recommendation_resolution_candidates
      WHERE id = (v_item ->> 'resolutionCandidateId')::uuid;
    SELECT * INTO v_definition FROM public.recommendation_definitions
      WHERE id = (v_item ->> 'recommendationDefinitionId')::uuid;

    SELECT jsonb_agg(candidate.recommendation_id ORDER BY candidate.recommendation_id), count(*)
      INTO v_expected_source_ids, v_source_count
      FROM jsonb_array_elements_text(v_resolution_candidate.source_candidate_gate_ids) source(id)
      JOIN public.recommendation_candidate_confidence_gates candidate
        ON candidate.id = source.id::uuid
      WHERE candidate.confidence_gate_id = v_gate.id
        AND candidate.post_gate_result <> 'withheld';
    SELECT jsonb_agg(trace_id ORDER BY trace_id), count(*)
      INTO v_expected_trace_ids, v_trace_count
      FROM jsonb_array_elements_text(v_resolution_candidate.source_trace_node_ids) trace(trace_id);

    SELECT ranked INTO v_canonical_rank
      FROM jsonb_array_elements(v_result.canonical_result #> '{recommendations,ranked}') ranked
      WHERE ranked ->> 'id' = v_item ->> 'recommendationId';
    SELECT max((ranked ->> 'impactValue')::numeric), max((ranked ->> 'urgency')::numeric)
      INTO v_expected_impact, v_expected_urgency
      FROM jsonb_array_elements(v_result.canonical_result #> '{recommendations,ranked}') ranked
      WHERE v_item -> 'sourceRecommendationIds' ? (ranked ->> 'id');
    SELECT ranked ->> 'impact' INTO v_expected_impact_band
      FROM jsonb_array_elements(v_result.canonical_result #> '{recommendations,ranked}') ranked
      WHERE v_item -> 'sourceRecommendationIds' ? (ranked ->> 'id')
      ORDER BY (ranked ->> 'impactValue')::numeric DESC, ranked ->> 'id' ASC
      LIMIT 1;
    v_expected_effort_ease := (
      v_run.configuration_snapshot #>> ARRAY[
        'recommendationPolicy', 'effortEaseValues', v_definition.definition ->> 'effort'
      ]
    )::numeric;
    v_expected_score :=
      v_expected_impact * (v_weights ->> 'impact')::numeric
      + v_expected_urgency * (v_weights ->> 'urgency')::numeric
      + v_gate.confidence_index * (v_weights ->> 'confidence')::numeric
      + v_expected_effort_ease * (v_weights ->> 'effortEase')::numeric
      + (v_canonical_rank ->> 'dependencyReadiness')::numeric
        * (v_weights ->> 'dependencyReadiness')::numeric;
    v_expected_label := CASE
      WHEN v_expected_score >= 85 THEN 'critical'
      WHEN v_expected_score >= 70 THEN 'high'
      WHEN v_expected_score >= 50 THEN 'medium'
      ELSE 'low'
    END;

    IF v_resolution_candidate.id IS NULL
       OR v_resolution_candidate.resolution_id <> v_resolution.id
       OR v_resolution_candidate.resolution_result <> 'canonical'
       OR v_definition.id IS NULL OR v_definition.catalogue_version_id <> v_catalogue.id
       OR v_definition.id <> v_resolution_candidate.recommendation_definition_id
       OR v_definition.recommendation_id <> v_item ->> 'recommendationId'
       OR v_definition.recommendation_version <> v_item ->> 'recommendationVersion'
       OR v_definition.catalogue_order <> (v_item ->> 'catalogueOrder')::integer
       OR v_resolution_candidate.post_confidence_result::text <> v_item ->> 'postConfidenceResult'
       OR v_canonical_rank IS NULL
       OR v_source_count <> jsonb_array_length(v_item -> 'sourceRecommendationIds')
       OR v_expected_source_ids IS DISTINCT FROM v_item -> 'sourceRecommendationIds'
       OR v_trace_count <> jsonb_array_length(v_item -> 'sourceTraceNodeIds')
       OR v_expected_trace_ids IS DISTINCT FROM v_item -> 'sourceTraceNodeIds'
       OR v_item ->> 'impact' <> v_expected_impact_band
       OR v_item ->> 'effort' <> v_definition.definition ->> 'effort'
       OR (v_item #>> '{components,impact}')::numeric <> v_expected_impact
       OR (v_item #>> '{components,urgency}')::numeric <> v_expected_urgency
       OR (v_item #>> '{components,confidence}')::numeric <> v_gate.confidence_index
       OR (v_item #>> '{components,effortEase}')::numeric <> v_expected_effort_ease
       OR (v_item #>> '{components,dependencyReadiness}')::numeric
          <> (v_canonical_rank ->> 'dependencyReadiness')::numeric
       OR v_item -> 'componentWeights' IS DISTINCT FROM v_weights
       OR abs((v_item ->> 'rawRankScore')::numeric - v_expected_score) > 0.000000001
       OR v_item ->> 'priorityLabel' <> v_expected_label
       OR jsonb_typeof(v_item -> 'rationale') <> 'array'
       OR jsonb_array_length(v_item -> 'rationale') <> 5
       OR v_item ->> 'semanticHash' !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
    END IF;

    SELECT count(*) INTO v_trace_count
      FROM jsonb_array_elements_text(v_item -> 'sourceTraceNodeIds') source(id)
      JOIN public.delivery_intelligence_trace_nodes trace ON trace.id = source.id::uuid
      WHERE trace.analysis_run_id = v_run.id
        AND trace.organisation_id = v_run.organisation_id
        AND trace.workspace_id = v_run.workspace_id;
    IF v_trace_count <> jsonb_array_length(v_item -> 'sourceTraceNodeIds') THEN
      RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
    END IF;

    INSERT INTO public.recommendation_priority_items (
      priority_model_id, resolution_candidate_id, analysis_run_id, organisation_id,
      workspace_id, recommendation_definition_id, recommendation_id,
      recommendation_version, catalogue_order, post_confidence_result, generated_rank,
      priority_label, impact, effort, raw_rank_score, components, component_weights,
      rationale, source_recommendation_ids, source_trace_node_ids, semantic_hash
    ) VALUES (
      v_model.id, v_resolution_candidate.id, v_run.id, v_run.organisation_id,
      v_run.workspace_id, v_definition.id, v_definition.recommendation_id,
      v_definition.recommendation_version, v_definition.catalogue_order,
      v_resolution_candidate.post_confidence_result, (v_item ->> 'generatedRank')::integer,
      (v_item ->> 'priorityLabel')::public.recommendation_priority_label,
      v_item ->> 'impact', v_item ->> 'effort', (v_item ->> 'rawRankScore')::numeric,
      v_item -> 'components', v_item -> 'componentWeights', v_item -> 'rationale',
      v_item -> 'sourceRecommendationIds', v_item -> 'sourceTraceNodeIds',
      v_item ->> 'semanticHash'
    );
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.recommendation_priority_items
    WHERE priority_model_id = v_model.id
    GROUP BY priority_model_id
    HAVING min(generated_rank) <> 1
       OR max(generated_rank) <> count(*)
       OR count(*) <> v_expected_count
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;
  RETURN v_model;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_recommendation_priority_display_preference(p_input jsonb)
RETURNS public.recommendation_priority_display_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_model public.recommendation_priority_models;
  v_previous public.recommendation_priority_display_preferences;
  v_existing public.recommendation_priority_display_preferences;
  v_preference public.recommendation_priority_display_preferences;
  v_expected_count integer;
  v_supplied_count integer;
BEGIN
  IF p_input IS NULL
     OR jsonb_typeof(p_input -> 'ordered_recommendation_ids') <> 'array'
     OR length(p_input ->> 'idempotency_key') NOT BETWEEN 16 AND 160
     OR (p_input ->> 'expected_version')::integer < 0 THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'priority_model_id', 0));
  SELECT * INTO v_model FROM public.recommendation_priority_models
    WHERE id = (p_input ->> 'priority_model_id')::uuid FOR SHARE;
  IF v_model.id IS NULL
     OR v_model.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_model.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspaces workspace ON workspace.id = v_model.workspace_id
       WHERE membership.user_id = (p_input ->> 'actor_user_id')::uuid
         AND membership.organisation_id = v_model.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace.organisation_id = v_model.organisation_id
         AND workspace.is_deleted = false
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;

  SELECT * INTO v_existing
    FROM public.recommendation_priority_display_preferences
    WHERE organisation_id = v_model.organisation_id
      AND workspace_id = v_model.workspace_id
      AND idempotency_key = p_input ->> 'idempotency_key';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.priority_model_id <> v_model.id
       OR v_existing.actor_user_id <> (p_input ->> 'actor_user_id')::uuid
       OR v_existing.ordered_recommendation_ids
          IS DISTINCT FROM p_input -> 'ordered_recommendation_ids' THEN
      RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
    END IF;
    RETURN v_existing;
  END IF;

  SELECT * INTO v_previous
    FROM public.recommendation_priority_display_preferences
    WHERE priority_model_id = v_model.id
    ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF coalesce(v_previous.version, 0) <> (p_input ->> 'expected_version')::integer THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_VERSION_CONFLICT';
  END IF;

  SELECT count(*) INTO v_expected_count
    FROM public.recommendation_priority_items WHERE priority_model_id = v_model.id;
  SELECT count(DISTINCT value) INTO v_supplied_count
    FROM jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids');
  IF jsonb_array_length(p_input -> 'ordered_recommendation_ids') <> v_expected_count
     OR v_supplied_count <> v_expected_count
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids') supplied(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.recommendation_priority_items item
         WHERE item.priority_model_id = v_model.id AND item.recommendation_id = supplied.id
       )
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_PRIORITY_INVALID';
  END IF;

  INSERT INTO public.recommendation_priority_display_preferences (
    priority_model_id, organisation_id, workspace_id, version, previous_preference_id,
    ordered_recommendation_ids, actor_user_id, idempotency_key
  ) VALUES (
    v_model.id, v_model.organisation_id, v_model.workspace_id,
    coalesce(v_previous.version, 0) + 1, v_previous.id,
    p_input -> 'ordered_recommendation_ids', (p_input ->> 'actor_user_id')::uuid,
    p_input ->> 'idempotency_key'
  ) RETURNING * INTO v_preference;
  RETURN v_preference;
END;
$$;

ALTER TABLE public.recommendation_priority_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_priority_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_priority_display_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_priority_models,
  public.recommendation_priority_items,
  public.recommendation_priority_display_preferences FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_priority_model(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_recommendation_priority_display_preference(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_priority_models,
  public.recommendation_priority_items,
  public.recommendation_priority_display_preferences TO service_role;
GRANT INSERT ON public.recommendation_priority_display_preferences TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_priority_model(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_priority_display_preference(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_priority_models IS
  'Immutable S4-005 generated priority baseline; customer display order is a separate overlay.';
COMMENT ON TABLE public.recommendation_priority_display_preferences IS
  'Append-only audited customer display-order preference; never changes generated priority.';
