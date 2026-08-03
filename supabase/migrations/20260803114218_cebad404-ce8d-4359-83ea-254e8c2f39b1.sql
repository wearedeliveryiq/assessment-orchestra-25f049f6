INSERT INTO public._s4_007_fn_parts VALUES (3, $p3$
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
$p3$);