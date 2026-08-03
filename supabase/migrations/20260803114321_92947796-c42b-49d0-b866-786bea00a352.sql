INSERT INTO public._s4_007_fn_parts VALUES (5, $p5$
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
$p5$);