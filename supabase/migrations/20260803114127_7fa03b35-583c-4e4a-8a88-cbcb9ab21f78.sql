CREATE TABLE public._s4_007_fn_parts (i integer PRIMARY KEY, s text NOT NULL);
ALTER TABLE public._s4_007_fn_parts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._s4_007_fn_parts FROM PUBLIC, anon, authenticated;

INSERT INTO public._s4_007_fn_parts VALUES (1, $p1$
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
$p1$);