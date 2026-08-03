INSERT INTO public._s4_007_fn_parts VALUES (2, $p2$
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
$p2$);