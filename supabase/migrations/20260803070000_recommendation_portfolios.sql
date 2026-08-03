CREATE TYPE public.recommendation_portfolio_class AS ENUM (
  'immediate_attention', 'foundation', 'quick_win', 'strategic_initiative', 'watch'
);
CREATE TYPE public.recommendation_portfolio_state AS ENUM ('empty', 'partial', 'complete');

CREATE TABLE public.recommendation_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  conflict_resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  priority_model_id uuid NOT NULL REFERENCES public.recommendation_priority_models(id) ON DELETE RESTRICT,
  sequence_model_id uuid NOT NULL REFERENCES public.recommendation_sequence_models(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  projector_version text NOT NULL,
  portfolio_state public.recommendation_portfolio_state NOT NULL,
  item_count integer NOT NULL CHECK (item_count BETWEEN 0 AND 250),
  scheduled_count integer NOT NULL CHECK (scheduled_count BETWEEN 0 AND item_count),
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_portfolio jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_model_id, policy_version),
  CONSTRAINT recommendation_portfolio_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'recommendationEvaluationId' = recommendation_evaluation_id::text
    AND canonical_input ->> 'confidenceGateId' = confidence_gate_id::text
    AND canonical_input ->> 'conflictResolutionId' = conflict_resolution_id::text
    AND canonical_input ->> 'priorityModelId' = priority_model_id::text
    AND canonical_input ->> 'sequenceModelId' = sequence_model_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_portfolio_output CHECK (
    canonical_portfolio ->> 'schemaVersion' = 'deliveryiq.recommendation-portfolio/1.0.0'
    AND canonical_portfolio ->> 'policyVersion' = policy_version
    AND canonical_portfolio ->> 'projectorVersion' = projector_version
    AND canonical_portfolio #>> '{summary,state}' = portfolio_state::text
    AND (canonical_portfolio #>> '{summary,itemCount}')::integer = item_count
    AND (canonical_portfolio #>> '{summary,scheduledCount}')::integer = scheduled_count
    AND jsonb_typeof(canonical_portfolio -> 'items') = 'array'
  )
);

CREATE TABLE public.recommendation_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  priority_item_id uuid NOT NULL REFERENCES public.recommendation_priority_items(id) ON DELETE RESTRICT,
  sequence_item_id uuid NOT NULL REFERENCES public.recommendation_sequence_items(id) ON DELETE RESTRICT,
  resolution_candidate_id uuid NOT NULL REFERENCES public.recommendation_resolution_candidates(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  portfolio_order integer NOT NULL CHECK (portfolio_order > 0),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  outcome text NOT NULL CHECK (length(btrim(outcome)) BETWEEN 1 AND 1000),
  success_measures jsonb NOT NULL CHECK (
    jsonb_typeof(success_measures) = 'array' AND jsonb_array_length(success_measures) > 0
  ),
  matched_triggers jsonb NOT NULL CHECK (
    jsonb_typeof(matched_triggers) = 'array' AND jsonb_array_length(matched_triggers) > 0
  ),
  generated_rank integer NOT NULL CHECK (generated_rank > 0),
  priority_label public.recommendation_priority_label NOT NULL,
  impact text NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  effort text NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  urgency numeric NOT NULL CHECK (urgency BETWEEN 0 AND 100),
  confidence_state public.recommendation_confidence_state NOT NULL,
  confidence_result public.recommendation_confidence_gate_result NOT NULL CHECK (
    confidence_result IN ('presented', 'evidence_first')
  ),
  confidence_caveat text,
  generated_sequence integer CHECK (generated_sequence IS NULL OR generated_sequence > 0),
  generated_horizon public.recommendation_sequence_horizon,
  sequence_state public.recommendation_sequence_state NOT NULL,
  sequence_reason_code text NOT NULL CHECK (sequence_reason_code IN (
    'dependency_precedence', 'dependency_satisfied', 'rank_and_horizon_fit',
    'blocked_dependency', 'capacity_exceeded'
  )),
  blocking_dependency_ids jsonb NOT NULL CHECK (jsonb_typeof(blocking_dependency_ids) = 'array'),
  dependencies jsonb NOT NULL CHECK (jsonb_typeof(dependencies) = 'array'),
  caveats jsonb NOT NULL CHECK (jsonb_typeof(caveats) = 'array'),
  rationale jsonb NOT NULL CHECK (jsonb_typeof(rationale) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (
    jsonb_typeof(source_trace_node_ids) = 'array'
    AND jsonb_array_length(source_trace_node_ids) > 0
  ),
  primary_class public.recommendation_portfolio_class NOT NULL,
  secondary_tags jsonb NOT NULL CHECK (jsonb_typeof(secondary_tags) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, recommendation_id),
  UNIQUE (portfolio_id, priority_item_id),
  UNIQUE (portfolio_id, sequence_item_id),
  UNIQUE (portfolio_id, portfolio_order),
  CONSTRAINT recommendation_portfolio_item_sequence_state CHECK (
    (
      sequence_state = 'scheduled'
      AND generated_sequence IS NOT NULL
      AND generated_horizon IS NOT NULL
    )
    OR (
      sequence_state <> 'scheduled'
      AND generated_sequence IS NULL
      AND generated_horizon IS NULL
    )
  )
);

CREATE INDEX recommendation_portfolios_tenant_run_idx
  ON public.recommendation_portfolios (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_portfolio_items_class_order_idx
  ON public.recommendation_portfolio_items (portfolio_id, primary_class, portfolio_order);

CREATE TRIGGER recommendation_portfolios_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_portfolios
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_portfolio_items_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_portfolio_items
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_portfolio(p_input jsonb)
RETURNS public.recommendation_portfolios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_run public.assessment_analysis_runs;
  v_evaluation public.recommendation_evaluations;
  v_gate public.recommendation_confidence_gates;
  v_resolution public.recommendation_conflict_resolutions;
  v_priority public.recommendation_priority_models;
  v_sequence public.recommendation_sequence_models;
  v_catalogue public.recommendation_catalogue_versions;
  v_existing public.recommendation_portfolios;
  v_portfolio public.recommendation_portfolios;
  v_priority_item public.recommendation_priority_items;
  v_sequence_item public.recommendation_sequence_items;
  v_resolution_candidate public.recommendation_resolution_candidates;
  v_definition public.recommendation_definitions;
  v_item jsonb;
  v_expected_count integer;
  v_scheduled_count integer;
  v_blocked_count integer;
  v_capacity_exceeded_count integer;
  v_source_count integer;
  v_trace_count integer;
  v_expected_triggers jsonb;
  v_expected_dependencies jsonb;
  v_expected_class public.recommendation_portfolio_class;
  v_expected_tags jsonb;
  v_is_immediate boolean;
  v_is_foundation boolean;
  v_is_quick_win boolean;
  v_is_strategic boolean;
  v_expected_class_counts jsonb;
BEGIN
  IF p_input IS NULL
     OR jsonb_typeof(p_input -> 'canonical_input') <> 'object'
     OR jsonb_typeof(p_input -> 'canonical_portfolio') <> 'object'
     OR jsonb_typeof(p_input -> 'items') <> 'array'
     OR jsonb_array_length(p_input -> 'items') > 250
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'sequence_model_id', 0));
  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_evaluation FROM public.recommendation_evaluations
    WHERE id = (p_input ->> 'recommendation_evaluation_id')::uuid FOR SHARE;
  SELECT * INTO v_gate FROM public.recommendation_confidence_gates
    WHERE id = (p_input ->> 'confidence_gate_id')::uuid FOR SHARE;
  SELECT * INTO v_resolution FROM public.recommendation_conflict_resolutions
    WHERE id = (p_input ->> 'conflict_resolution_id')::uuid FOR SHARE;
  SELECT * INTO v_priority FROM public.recommendation_priority_models
    WHERE id = (p_input ->> 'priority_model_id')::uuid FOR SHARE;
  SELECT * INTO v_sequence FROM public.recommendation_sequence_models
    WHERE id = (p_input ->> 'sequence_model_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;

  IF v_run.id IS NULL OR v_run.status <> 'completed'
     OR v_evaluation.id IS NULL OR v_evaluation.analysis_run_id <> v_run.id
     OR v_gate.id IS NULL OR v_gate.analysis_run_id <> v_run.id
     OR v_gate.recommendation_evaluation_id <> v_evaluation.id
     OR v_resolution.id IS NULL OR v_resolution.analysis_run_id <> v_run.id
     OR v_resolution.recommendation_evaluation_id <> v_evaluation.id
     OR v_resolution.confidence_gate_id <> v_gate.id
     OR v_priority.id IS NULL OR v_priority.analysis_run_id <> v_run.id
     OR v_priority.recommendation_evaluation_id <> v_evaluation.id
     OR v_priority.confidence_gate_id <> v_gate.id
     OR v_priority.conflict_resolution_id <> v_resolution.id
     OR v_sequence.id IS NULL OR v_sequence.analysis_run_id <> v_run.id
     OR v_sequence.priority_model_id <> v_priority.id
     OR v_sequence.conflict_resolution_id <> v_resolution.id
     OR v_catalogue.id IS NULL
     OR v_evaluation.catalogue_version_id <> v_catalogue.id
     OR v_gate.catalogue_version_id <> v_catalogue.id
     OR v_resolution.catalogue_version_id <> v_catalogue.id
     OR v_priority.catalogue_version_id <> v_catalogue.id
     OR v_sequence.catalogue_version_id <> v_catalogue.id
     OR v_evaluation.catalogue_digest <> v_catalogue.content_digest
     OR v_gate.catalogue_digest <> v_catalogue.content_digest
     OR v_resolution.catalogue_digest <> v_catalogue.content_digest
     OR v_priority.catalogue_digest <> v_catalogue.content_digest
     OR v_sequence.catalogue_digest <> v_catalogue.content_digest
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_evaluation.organisation_id <> v_run.organisation_id
     OR v_evaluation.workspace_id <> v_run.workspace_id
     OR v_gate.organisation_id <> v_run.organisation_id
     OR v_gate.workspace_id <> v_run.workspace_id
     OR v_resolution.organisation_id <> v_run.organisation_id
     OR v_resolution.workspace_id <> v_run.workspace_id
     OR v_priority.organisation_id <> v_run.organisation_id
     OR v_priority.workspace_id <> v_run.workspace_id
     OR v_sequence.organisation_id <> v_run.organisation_id
     OR v_sequence.workspace_id <> v_run.workspace_id
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR v_catalogue.source_configuration_set_id <> v_run.configuration_set_id
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest'
     OR v_priority.output_hash <> p_input #>> '{canonical_input,priorityModelHash}'
     OR v_sequence.output_hash <> p_input #>> '{canonical_input,sequenceModelHash}' THEN
    RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
  END IF;

  SELECT * INTO v_existing FROM public.recommendation_portfolios
    WHERE sequence_model_id = v_sequence.id
      AND policy_version = p_input ->> 'policy_version';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.input_hash <> p_input ->> 'input_hash'
       OR v_existing.output_hash <> p_input ->> 'output_hash' THEN
      RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
    END IF;
    RETURN v_existing;
  END IF;

  SELECT count(*) INTO v_expected_count FROM public.recommendation_priority_items
    WHERE priority_model_id = v_priority.id;
  SELECT count(*) INTO v_scheduled_count FROM public.recommendation_sequence_items
    WHERE sequence_model_id = v_sequence.id AND sequence_state = 'scheduled';
  SELECT count(*) INTO v_blocked_count FROM public.recommendation_sequence_items
    WHERE sequence_model_id = v_sequence.id AND sequence_state = 'blocked_dependency';
  SELECT count(*) INTO v_capacity_exceeded_count FROM public.recommendation_sequence_items
    WHERE sequence_model_id = v_sequence.id AND sequence_state = 'capacity_exceeded';
  IF v_expected_count <> (SELECT count(*) FROM public.recommendation_sequence_items
      WHERE sequence_model_id = v_sequence.id)
     OR jsonb_array_length(p_input -> 'items') <> v_expected_count
     OR p_input #> '{canonical_portfolio,items}' IS DISTINCT FROM p_input -> 'items'
     OR (p_input ->> 'item_count')::integer <> v_expected_count
     OR (p_input ->> 'scheduled_count')::integer <> v_scheduled_count
     OR (p_input #>> '{canonical_portfolio,summary,blockedCount}')::integer <> v_blocked_count
     OR (p_input #>> '{canonical_portfolio,summary,capacityExceededCount}')::integer
        <> v_capacity_exceeded_count
     OR p_input ->> 'portfolio_state' <> CASE
       WHEN v_expected_count = 0 THEN 'empty'
       WHEN v_expected_count = v_scheduled_count THEN 'complete'
       ELSE 'partial'
     END THEN
    RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
  END IF;

  INSERT INTO public.recommendation_portfolios (
    analysis_run_id, recommendation_evaluation_id, confidence_gate_id,
    conflict_resolution_id, priority_model_id, sequence_model_id,
    organisation_id, workspace_id, configuration_set_id,
    catalogue_version_id, catalogue_id, catalogue_version, catalogue_digest,
    policy_version, projector_version, portfolio_state, item_count, scheduled_count,
    input_hash, output_hash, canonical_input, canonical_portfolio
  ) VALUES (
    v_run.id, v_evaluation.id, v_gate.id, v_resolution.id, v_priority.id, v_sequence.id,
    v_run.organisation_id, v_run.workspace_id, v_run.configuration_set_id,
    v_catalogue.id, v_catalogue.catalogue_id, v_catalogue.version, v_catalogue.content_digest,
    p_input ->> 'policy_version', p_input ->> 'projector_version',
    (p_input ->> 'portfolio_state')::public.recommendation_portfolio_state,
    v_expected_count, v_scheduled_count, p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_portfolio'
  ) RETURNING * INTO v_portfolio;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input -> 'items') LOOP
    SELECT * INTO v_priority_item FROM public.recommendation_priority_items
      WHERE id = (v_item ->> 'priorityItemId')::uuid AND priority_model_id = v_priority.id;
    SELECT * INTO v_sequence_item FROM public.recommendation_sequence_items
      WHERE id = (v_item ->> 'sequenceItemId')::uuid AND sequence_model_id = v_sequence.id;
    SELECT * INTO v_resolution_candidate FROM public.recommendation_resolution_candidates
      WHERE id = (v_item ->> 'resolutionCandidateId')::uuid
        AND resolution_id = v_resolution.id;
    SELECT * INTO v_definition FROM public.recommendation_definitions
      WHERE id = (v_item ->> 'recommendationDefinitionId')::uuid
        AND catalogue_version_id = v_catalogue.id;

    SELECT count(*) INTO v_source_count
    FROM jsonb_array_elements_text(v_priority_item.source_recommendation_ids) source(id)
    JOIN public.recommendation_candidate_evaluations candidate
      ON candidate.evaluation_id = v_evaluation.id
     AND candidate.recommendation_id = source.id
     AND candidate.result = 'eligible';
    SELECT coalesce(jsonb_agg(trigger_value.value ORDER BY trigger_value.value), '[]'::jsonb)
      INTO v_expected_triggers
    FROM (
      SELECT DISTINCT matched_trigger.value
      FROM jsonb_array_elements_text(v_priority_item.source_recommendation_ids) source(id)
      JOIN public.recommendation_candidate_evaluations candidate
        ON candidate.evaluation_id = v_evaluation.id
       AND candidate.recommendation_id = source.id
       AND candidate.result = 'eligible'
      CROSS JOIN LATERAL jsonb_array_elements_text(candidate.matched_triggers) matched_trigger(value)
    ) trigger_value;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'recommendationId', coalesce(dependency.resolved_dependency_id, dependency.source_dependency_id),
      'sourceDependencyId', dependency.source_dependency_id,
      'type', dependency.dependency_type,
      'state', dependency.dependency_state,
      'resolution', dependency.resolution,
      'reasonCode', dependency.reason_code
    ) ORDER BY dependency.source_dependency_id, dependency.dependency_type), '[]'::jsonb)
      INTO v_expected_dependencies
    FROM public.recommendation_sequence_dependencies dependency
    WHERE dependency.sequence_model_id = v_sequence.id
      AND dependency.dependant_recommendation_id = v_sequence_item.recommendation_id;

    v_is_immediate := v_priority_item.priority_label IN ('critical', 'high')
      AND (v_priority_item.components ->> 'urgency')::numeric >= 90;
    v_is_foundation := EXISTS (
      SELECT 1 FROM public.recommendation_sequence_dependencies dependency
      WHERE dependency.sequence_model_id = v_sequence.id
        AND dependency.resolved_dependency_id = v_sequence_item.recommendation_id
        AND dependency.dependant_recommendation_id <> v_sequence_item.recommendation_id
    );
    v_is_quick_win := v_priority_item.effort = 'low'
      AND v_priority_item.impact IN ('medium', 'high')
      AND NOT EXISTS (
        SELECT 1 FROM public.recommendation_sequence_dependencies dependency
        WHERE dependency.sequence_model_id = v_sequence.id
          AND dependency.dependant_recommendation_id = v_sequence_item.recommendation_id
          AND dependency.dependency_type = 'required'
          AND dependency.dependency_state <> 'available'
      );
    v_is_strategic := v_priority_item.effort = 'high'
      OR v_sequence_item.generated_horizon = 'day90';
    v_expected_class := CASE
      WHEN v_is_immediate THEN 'immediate_attention'
      WHEN v_is_foundation THEN 'foundation'
      WHEN v_is_quick_win THEN 'quick_win'
      WHEN v_is_strategic THEN 'strategic_initiative'
      ELSE 'watch'
    END::public.recommendation_portfolio_class;
    SELECT coalesce(jsonb_agg(tag ORDER BY precedence), '[]'::jsonb) INTO v_expected_tags
    FROM (VALUES
      ('immediate_attention', 1, v_is_immediate),
      ('foundation', 2, v_is_foundation),
      ('quick_win', 3, v_is_quick_win),
      ('strategic_initiative', 4, v_is_strategic)
    ) tags(tag, precedence, matched)
    WHERE matched AND tag <> v_expected_class::text;

    SELECT count(*) INTO v_trace_count
    FROM jsonb_array_elements_text(v_item -> 'sourceTraceNodeIds') supplied(id)
    JOIN public.delivery_intelligence_trace_nodes trace ON trace.id = supplied.id::uuid
    WHERE trace.analysis_run_id = v_run.id
      AND trace.organisation_id = v_run.organisation_id
      AND trace.workspace_id = v_run.workspace_id;

    IF v_priority_item.id IS NULL OR v_sequence_item.id IS NULL
       OR v_resolution_candidate.id IS NULL OR v_definition.id IS NULL
       OR v_priority_item.resolution_candidate_id <> v_resolution_candidate.id
       OR v_priority_item.recommendation_definition_id <> v_definition.id
       OR v_priority_item.recommendation_id <> v_item ->> 'recommendationId'
       OR v_sequence_item.recommendation_id <> v_item ->> 'recommendationId'
       OR v_definition.recommendation_id <> v_item ->> 'recommendationId'
       OR v_priority_item.recommendation_version <> v_item ->> 'recommendationVersion'
       OR v_sequence_item.recommendation_version <> v_item ->> 'recommendationVersion'
       OR v_definition.recommendation_version <> v_item ->> 'recommendationVersion'
       OR v_priority_item.catalogue_order <> (v_item ->> 'catalogueOrder')::integer
       OR v_priority_item.generated_rank <> (v_item ->> 'generatedRank')::integer
       OR v_priority_item.priority_label::text <> v_item ->> 'priorityLabel'
       OR v_priority_item.impact <> v_item ->> 'impact'
       OR v_priority_item.effort <> v_item ->> 'effort'
       OR (v_priority_item.components ->> 'urgency')::numeric <> (v_item ->> 'urgency')::numeric
       OR v_priority_item.post_confidence_result::text <> v_item ->> 'confidenceResult'
       OR v_gate.confidence_state::text <> v_item ->> 'confidenceState'
       OR v_gate.caveat IS DISTINCT FROM v_item ->> 'confidenceCaveat'
       OR v_sequence_item.generated_sequence IS DISTINCT FROM NULLIF(v_item ->> 'generatedSequence', '')::integer
       OR v_sequence_item.generated_horizon::text IS DISTINCT FROM v_item ->> 'generatedHorizon'
       OR v_sequence_item.sequence_state::text <> v_item ->> 'sequenceState'
       OR v_sequence_item.reason_code <> v_item ->> 'sequenceReasonCode'
       OR v_sequence_item.blocking_dependency_ids IS DISTINCT FROM v_item -> 'blockingDependencyIds'
       OR v_sequence_item.caveats IS DISTINCT FROM v_item -> 'caveats'
       OR v_priority_item.rationale IS DISTINCT FROM v_item -> 'rationale'
       OR v_priority_item.source_trace_node_ids IS DISTINCT FROM v_item -> 'sourceTraceNodeIds'
       OR v_definition.definition ->> 'title' <> v_item ->> 'title'
       OR v_definition.definition ->> 'outcome' <> v_item ->> 'outcome'
       OR v_definition.definition -> 'successMeasures' IS DISTINCT FROM v_item -> 'successMeasures'
       OR v_source_count <> jsonb_array_length(v_priority_item.source_recommendation_ids)
       OR v_expected_triggers IS DISTINCT FROM v_item -> 'matchedTriggers'
       OR v_expected_dependencies IS DISTINCT FROM v_item -> 'dependencies'
       OR v_expected_class::text <> v_item ->> 'primaryClass'
       OR v_expected_tags IS DISTINCT FROM v_item -> 'secondaryTags'
       OR v_trace_count <> jsonb_array_length(v_item -> 'sourceTraceNodeIds')
       OR v_item ->> 'semanticHash' !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
    END IF;

    INSERT INTO public.recommendation_portfolio_items (
      portfolio_id, priority_item_id, sequence_item_id, resolution_candidate_id,
      recommendation_definition_id, analysis_run_id, organisation_id, workspace_id,
      recommendation_id, recommendation_version, catalogue_order, portfolio_order,
      title, outcome, success_measures, matched_triggers, generated_rank,
      priority_label, impact, effort, urgency, confidence_state, confidence_result,
      confidence_caveat, generated_sequence, generated_horizon, sequence_state,
      sequence_reason_code, blocking_dependency_ids, dependencies, caveats, rationale,
      source_trace_node_ids, primary_class, secondary_tags, semantic_hash
    ) VALUES (
      v_portfolio.id, v_priority_item.id, v_sequence_item.id, v_resolution_candidate.id,
      v_definition.id, v_run.id, v_run.organisation_id, v_run.workspace_id,
      v_item ->> 'recommendationId', v_item ->> 'recommendationVersion',
      (v_item ->> 'catalogueOrder')::integer, (v_item ->> 'portfolioOrder')::integer,
      v_item ->> 'title', v_item ->> 'outcome', v_item -> 'successMeasures',
      v_item -> 'matchedTriggers', (v_item ->> 'generatedRank')::integer,
      (v_item ->> 'priorityLabel')::public.recommendation_priority_label,
      v_item ->> 'impact', v_item ->> 'effort', (v_item ->> 'urgency')::numeric,
      (v_item ->> 'confidenceState')::public.recommendation_confidence_state,
      (v_item ->> 'confidenceResult')::public.recommendation_confidence_gate_result,
      v_item ->> 'confidenceCaveat', NULLIF(v_item ->> 'generatedSequence', '')::integer,
      NULLIF(v_item ->> 'generatedHorizon', '')::public.recommendation_sequence_horizon,
      (v_item ->> 'sequenceState')::public.recommendation_sequence_state,
      v_item ->> 'sequenceReasonCode', v_item -> 'blockingDependencyIds',
      v_item -> 'dependencies', v_item -> 'caveats', v_item -> 'rationale',
      v_item -> 'sourceTraceNodeIds',
      (v_item ->> 'primaryClass')::public.recommendation_portfolio_class,
      v_item -> 'secondaryTags', v_item ->> 'semanticHash'
    );
  END LOOP;

  SELECT jsonb_build_object(
    'immediate_attention', count(*) FILTER (WHERE primary_class = 'immediate_attention'),
    'foundation', count(*) FILTER (WHERE primary_class = 'foundation'),
    'quick_win', count(*) FILTER (WHERE primary_class = 'quick_win'),
    'strategic_initiative', count(*) FILTER (WHERE primary_class = 'strategic_initiative'),
    'watch', count(*) FILTER (WHERE primary_class = 'watch')
  ) INTO v_expected_class_counts
  FROM public.recommendation_portfolio_items WHERE portfolio_id = v_portfolio.id;
  IF EXISTS (
    SELECT 1 FROM public.recommendation_portfolio_items
    WHERE portfolio_id = v_portfolio.id
    GROUP BY portfolio_id
    HAVING min(portfolio_order) <> 1
       OR max(portfolio_order) <> count(*)
       OR count(DISTINCT portfolio_order) <> count(*)
  ) OR EXISTS (
    SELECT 1
    FROM (
      SELECT item.id, item.portfolio_order,
        row_number() OVER (ORDER BY
          CASE item.primary_class
            WHEN 'immediate_attention' THEN 1
            WHEN 'foundation' THEN 2
            WHEN 'quick_win' THEN 3
            WHEN 'strategic_initiative' THEN 4
            ELSE 5
          END,
          item.generated_sequence NULLS LAST,
          item.generated_rank,
          item.catalogue_order,
          item.recommendation_id
        ) AS expected_order
      FROM public.recommendation_portfolio_items item
      WHERE item.portfolio_id = v_portfolio.id
    ) ordered
    WHERE ordered.portfolio_order <> ordered.expected_order
  ) OR v_expected_class_counts IS DISTINCT FROM p_input #> '{canonical_portfolio,summary,classCounts}'
     OR (SELECT count(*) FROM public.recommendation_portfolio_items
         WHERE portfolio_id = v_portfolio.id) <> v_expected_count THEN
    RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
  END IF;
  RETURN v_portfolio;
END;
$$;

ALTER TABLE public.recommendation_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_portfolio_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_portfolios,
  public.recommendation_portfolio_items FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_portfolios,
  public.recommendation_portfolio_items TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_portfolios IS
  'Immutable S4-007 customer-ready recommendation portfolio baseline.';
COMMENT ON TABLE public.recommendation_portfolio_items IS
  'Immutable classified portfolio items reconciled to evaluation, priority and sequence.';
