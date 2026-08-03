INSERT INTO public._s4_007_fn_parts VALUES (4, $p4$
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
$p4$);