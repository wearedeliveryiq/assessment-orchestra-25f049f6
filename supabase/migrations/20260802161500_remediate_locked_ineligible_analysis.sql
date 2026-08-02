-- PDR-003-002 §9: append the approved eligibility decision for the verified
-- legacy run without changing the immutable run or its event history.
DO $$
DECLARE
  v_run_id constant uuid := 'b822ce85-f2bf-4cde-ba2f-b8abc31713cf';
  v_decision_id uuid;
  v_handoff public.assessment_analysis_handoffs;
  v_manifest_digest text;
  v_verified record;
BEGIN
  SELECT h AS handoff,
         encode(digest(convert_to(array_to_json(array_agg(
           response ->> 'questionId' ORDER BY response ->> 'questionId'
         ))::text, 'UTF8'), 'sha256'), 'hex') AS manifest_digest
    INTO v_verified
  FROM public.assessment_analysis_runs r
  JOIN public.assessment_sessions s ON s.id = r.assessment_session_id
  JOIN public.assessment_analysis_handoffs h
    ON h.assessment_session_id = r.assessment_session_id
   AND h.assessment_revision = r.assessment_revision
   AND h.configuration_set_id = r.configuration_set_id
   AND h.requested_mode = r.requested_mode
  CROSS JOIN LATERAL jsonb_array_elements(r.canonical_input -> 'responses') response
  WHERE r.id = v_run_id
    AND r.organisation_id = s.organisation_id
    AND r.workspace_id = s.workspace_id
    AND r.assessment_revision = s.assessment_revision
    AND h.organisation_id = r.organisation_id
    AND h.workspace_id = r.workspace_id
    AND h.analysis_run_id = r.id
    AND r.canonical_input #>> '{assessment,assessmentType}' = 'delivery-maturity'
    AND r.canonical_input #>> '{knowledgePack,id}' = 'executive-sponsorship'
    AND r.canonical_input #>> '{knowledgePack,version}' = '1.4.0'
  GROUP BY h.id;

  v_handoff := v_verified.handoff;
  v_manifest_digest := v_verified.manifest_digest;

  IF v_handoff.id IS NULL THEN
    RAISE EXCEPTION 'PDR_003_002_REMEDIATION_SCOPE_VERIFICATION_FAILED';
  END IF;

  INSERT INTO public.assessment_analysis_eligibility_decisions (
    handoff_id, assessment_session_id, organisation_id, workspace_id,
    assessment_revision, configuration_set_id, assessment_type,
    knowledge_pack_id, knowledge_pack_version, question_set_id,
    question_set_version, assessment_manifest_digest, configured_manifest_digest,
    status, primary_reason_code, secondary_reason_codes, policy_id,
    policy_version, evaluator_version, correlation_id, analysis_run_id
  ) VALUES (
    v_handoff.id, v_handoff.assessment_session_id, v_handoff.organisation_id,
    v_handoff.workspace_id, v_handoff.assessment_revision, v_handoff.configuration_set_id,
    'delivery-maturity', 'executive-sponsorship', '1.4.0',
    'executive-sponsorship', '1.4.0', v_manifest_digest,
    '724b0c6caaa86cf13c1b1953a6edbbdcc37ef68891d58495f2a0ba85c7a5306d',
    'ineligible', 'ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE',
    ARRAY['ANALYSIS_PACK_ID_INELIGIBLE', 'ANALYSIS_PACK_VERSION_INELIGIBLE',
          'ANALYSIS_QUESTION_SET_ID_INELIGIBLE', 'ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE',
          'ANALYSIS_QUESTION_SET_INCOMPATIBLE'],
    'PDR-003-002', '1.0', 'deliveryiq.analysis-eligibility/1.0.0',
    v_handoff.correlation_id, v_run_id
  )
  ON CONFLICT (organisation_id, workspace_id, assessment_session_id,
               assessment_revision, configuration_set_id, policy_id, policy_version)
  DO NOTHING
  RETURNING id INTO v_decision_id;

  IF v_decision_id IS NULL THEN
    SELECT id INTO v_decision_id
    FROM public.assessment_analysis_eligibility_decisions
    WHERE organisation_id = v_handoff.organisation_id
      AND workspace_id = v_handoff.workspace_id
      AND assessment_session_id = v_handoff.assessment_session_id
      AND assessment_revision = v_handoff.assessment_revision
      AND configuration_set_id = v_handoff.configuration_set_id
      AND policy_id = 'PDR-003-002' AND policy_version = '1.0'
      AND status = 'ineligible' AND analysis_run_id = v_run_id;
  END IF;
  IF v_decision_id IS NULL THEN
    RAISE EXCEPTION 'PDR_003_002_REMEDIATION_DECISION_CONFLICT';
  END IF;

  IF v_handoff.status <> 'ineligible' THEN
    PERFORM public.mark_assessment_analysis_handoff_ineligible(v_handoff.id, v_decision_id);
    INSERT INTO public.assessment_analysis_handoff_events (
      handoff_id, assessment_session_id, organisation_id, workspace_id,
      correlation_id, event_type, payload
    ) VALUES (
      v_handoff.id, v_handoff.assessment_session_id, v_handoff.organisation_id,
      v_handoff.workspace_id, v_handoff.correlation_id,
      'analysis.ineligible_remediated',
      jsonb_build_object('eligibilityDecisionId', v_decision_id,
                         'analysisRunId', v_run_id,
                         'policyId', 'PDR-003-002', 'policyVersion', '1.0')
    );
  END IF;
END;
$$;
