-- Delivery DNA 2.0 clean cutover. Historical 1.x records remain immutable and
-- are never translated, recalculated or granted new customer access.

ALTER TABLE public.delivery_dna_snapshot_sessions
  DROP CONSTRAINT delivery_dna_snapshot_configuration_version,
  DROP CONSTRAINT delivery_dna_snapshot_presentation_policy_version,
  ADD CONSTRAINT delivery_dna_snapshot_configuration_version
    CHECK (configuration_version IN ('1.0.0', '1.1.0', '2.0.0')),
  ADD CONSTRAINT delivery_dna_snapshot_presentation_policy_version
    CHECK (presentation_policy_version IN ('1.0.0', '1.1.0', '2.0.0')),
  ADD COLUMN scope_type text,
  ADD COLUMN scope_display_name text,
  ADD CONSTRAINT delivery_dna_snapshot_scope_type CHECK (
    scope_type IS NULL OR scope_type IN (
      'whole_organisation',
      'business_unit_or_division',
      'function',
      'defined_delivery_portfolio_or_delivery_system'
    )
  ),
  ADD CONSTRAINT delivery_dna_snapshot_scope_name CHECK (
    scope_display_name IS NULL OR length(trim(scope_display_name)) BETWEEN 2 AND 120
  );

ALTER TABLE public.delivery_dna_snapshot_responses
  DROP CONSTRAINT delivery_dna_snapshot_responses_question_id_check,
  DROP CONSTRAINT delivery_dna_snapshot_responses_capability_order_check,
  DROP CONSTRAINT delivery_dna_snapshot_responses_answer_check,
  DROP CONSTRAINT delivery_dna_snapshot_exact_manifest,
  ADD CONSTRAINT delivery_dna_snapshot_responses_question_id_check
    CHECK (question_id ~ '^(ddna|ddna2)\.[a-z_]+\.p$'),
  ADD CONSTRAINT delivery_dna_snapshot_responses_capability_order_check
    CHECK (capability_order BETWEEN 1 AND 15),
  ADD CONSTRAINT delivery_dna_snapshot_responses_answer_check CHECK (
    answer IS NULL
    OR (question_id LIKE 'ddna2.%' AND answer BETWEEN 1 AND 4)
    OR (question_id LIKE 'ddna.%' AND answer BETWEEN 1 AND 5)
  ),
  ADD CONSTRAINT delivery_dna_snapshot_exact_manifest CHECK (
    (question_id = 'ddna.strategy_alignment.p' AND capability_id = 'strategy_alignment' AND capability_order = 1)
    OR (question_id = 'ddna.governance.p' AND capability_id = 'governance' AND capability_order = 2)
    OR (question_id = 'ddna.sponsorship.p' AND capability_id = 'sponsorship' AND capability_order = 3)
    OR (question_id = 'ddna.portfolio.p' AND capability_id = 'portfolio' AND capability_order = 4)
    OR (question_id = 'ddna.programme_delivery.p' AND capability_id = 'programme_delivery' AND capability_order = 5)
    OR (question_id = 'ddna.project_delivery.p' AND capability_id = 'project_delivery' AND capability_order = 6)
    OR (question_id = 'ddna.planning_controls.p' AND capability_id = 'planning_controls' AND capability_order = 7)
    OR (question_id = 'ddna.benefits.p' AND capability_id = 'benefits' AND capability_order = 8)
    OR (question_id = 'ddna.risk_assurance.p' AND capability_id = 'risk_assurance' AND capability_order = 9)
    OR (question_id = 'ddna.stakeholder_change.p' AND capability_id = 'stakeholder_change' AND capability_order = 10)
    OR (question_id = 'ddna.pmo_enablement.p' AND capability_id = 'pmo_enablement' AND capability_order = 11)
    OR (question_id = 'ddna.reporting_insight.p' AND capability_id = 'reporting_insight' AND capability_order = 12)
    OR (question_id = 'ddna.continuous_improvement.p' AND capability_id = 'continuous_improvement' AND capability_order = 13)
    OR (question_id = 'ddna2.strategic_alignment.p' AND capability_id = 'strategic_alignment' AND capability_order = 1)
    OR (question_id = 'ddna2.portfolio_prioritisation.p' AND capability_id = 'portfolio_prioritisation' AND capability_order = 2)
    OR (question_id = 'ddna2.benefits_value.p' AND capability_id = 'benefits_value' AND capability_order = 3)
    OR (question_id = 'ddna2.sponsorship_accountability.p' AND capability_id = 'sponsorship_accountability' AND capability_order = 4)
    OR (question_id = 'ddna2.governance_decision_making.p' AND capability_id = 'governance_decision_making' AND capability_order = 5)
    OR (question_id = 'ddna2.risk_assurance_resilience.p' AND capability_id = 'risk_assurance_resilience' AND capability_order = 6)
    OR (question_id = 'ddna2.delivery_approach_lifecycle.p' AND capability_id = 'delivery_approach_lifecycle' AND capability_order = 7)
    OR (question_id = 'ddna2.planning_control_dependencies.p' AND capability_id = 'planning_control_dependencies' AND capability_order = 8)
    OR (question_id = 'ddna2.capacity_delivery_ecosystem.p' AND capability_id = 'capacity_delivery_ecosystem' AND capability_order = 9)
    OR (question_id = 'ddna2.leadership_culture_collaboration.p' AND capability_id = 'leadership_culture_collaboration' AND capability_order = 10)
    OR (question_id = 'ddna2.stakeholder_change_adoption.p' AND capability_id = 'stakeholder_change_adoption' AND capability_order = 11)
    OR (question_id = 'ddna2.delivery_capability_enablement.p' AND capability_id = 'delivery_capability_enablement' AND capability_order = 12)
    OR (question_id = 'ddna2.data_reporting_decision_insight.p' AND capability_id = 'data_reporting_decision_insight' AND capability_order = 13)
    OR (question_id = 'ddna2.learning_adaptability_improvement.p' AND capability_id = 'learning_adaptability_improvement' AND capability_order = 14)
    OR (question_id = 'ddna2.digital_automation_responsible_ai.p' AND capability_id = 'digital_automation_responsible_ai' AND capability_order = 15)
  );

ALTER TABLE public.delivery_dna_snapshot_funnel_events
  DROP CONSTRAINT delivery_dna_snapshot_funnel_events_step_number_check,
  ADD CONSTRAINT delivery_dna_snapshot_funnel_events_step_number_check
    CHECK (step_number IS NULL OR step_number BETWEEN 1 AND 15);

ALTER TABLE public.assessment_responses
  DROP CONSTRAINT assessment_response_snapshot_provenance,
  ADD CONSTRAINT assessment_response_snapshot_provenance CHECK (
    (provenance_source IS NULL AND provenance_version IS NULL AND original_responded_at IS NULL)
    OR (
      provenance_source = 'delivery-dna-snapshot'
      AND provenance_version IN ('1.0.0', '1.1.0', '2.0.0')
      AND original_responded_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_delivery_dna_snapshot_versions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.configuration_version IS DISTINCT FROM OLD.configuration_version THEN
    RAISE EXCEPTION 'SNAPSHOT_CONFIGURATION_VERSION_IMMUTABLE';
  END IF;
  IF NEW.presentation_policy_version IS DISTINCT FROM OLD.presentation_policy_version
     AND NOT (
       OLD.presentation_policy_version = '1.0.0'
       AND NEW.presentation_policy_version = '1.1.0'
     ) THEN
    RAISE EXCEPTION 'SNAPSHOT_PRESENTATION_VERSION_TRANSITION_INVALID';
  END IF;
  IF OLD.configuration_version = '2.0.0'
     AND (
       NEW.scope_type IS DISTINCT FROM OLD.scope_type
       OR NEW.scope_display_name IS DISTINCT FROM OLD.scope_display_name
     ) THEN
    RAISE EXCEPTION 'SNAPSHOT_SCOPE_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_delivery_dna_snapshot_v2(
  p_token_hash text,
  p_ip_hash text,
  p_scope_type text,
  p_scope_display_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'SNAPSHOT_REQUEST_INVALID';
  END IF;
  IF p_scope_type NOT IN (
      'whole_organisation', 'business_unit_or_division', 'function',
      'defined_delivery_portfolio_or_delivery_system'
    ) OR length(trim(p_scope_display_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'SNAPSHOT_REQUEST_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  IF (SELECT count(*) FROM public.delivery_dna_snapshot_access_events
      WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 minute') >= 60
     OR (SELECT count(*) FROM public.delivery_dna_snapshot_access_events
      WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 day') >= 1000 THEN
    RAISE EXCEPTION 'SNAPSHOT_RATE_LIMITED';
  END IF;
  INSERT INTO public.delivery_dna_snapshot_access_events (ip_hash) VALUES (p_ip_hash);
  INSERT INTO public.delivery_dna_snapshot_sessions (
    token_hash, configuration_version, presentation_policy_version,
    scope_type, scope_display_name
  ) VALUES (
    p_token_hash, '2.0.0', '2.0.0', p_scope_type, trim(p_scope_display_name)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_delivery_dna_snapshot(
  p_token_hash text,
  p_user_id uuid,
  p_organisation_id uuid,
  p_workspace_id uuid,
  p_organisation_name text,
  p_manifest_metadata jsonb,
  p_consent boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_snapshot public.delivery_dna_snapshot_sessions;
  v_assessment_id uuid;
  v_response_count integer;
  v_answered_count integer;
BEGIN
  IF p_consent IS DISTINCT FROM true OR length(trim(p_organisation_name)) < 1 THEN
    RAISE EXCEPTION 'SNAPSHOT_LINKING_CONSENT_REQUIRED';
  END IF;
  SELECT * INTO v_snapshot FROM public.delivery_dna_snapshot_sessions
    WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_snapshot.id IS NULL OR v_snapshot.configuration_version <> '2.0.0'
     OR v_snapshot.status = 'in_progress' OR v_snapshot.expires_at <= now()
     OR v_snapshot.scope_type IS NULL OR v_snapshot.scope_display_name IS NULL THEN
    RAISE EXCEPTION 'SNAPSHOT_LINK_UNAVAILABLE';
  END IF;
  IF v_snapshot.status = 'linked' THEN
    IF v_snapshot.linked_user_id = p_user_id
       AND v_snapshot.organisation_id = p_organisation_id
       AND v_snapshot.workspace_id = p_workspace_id THEN
      RETURN v_snapshot.assessment_session_id;
    END IF;
    RAISE EXCEPTION 'SNAPSHOT_LINK_UNAVAILABLE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships membership
    JOIN public.workspaces workspace ON workspace.id = p_workspace_id
    WHERE membership.user_id = p_user_id
      AND membership.organisation_id = p_organisation_id
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace.organisation_id = p_organisation_id AND workspace.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'SNAPSHOT_LINK_UNAVAILABLE';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE evidence_status = 'answered')
    INTO v_response_count, v_answered_count
  FROM public.delivery_dna_snapshot_responses
  WHERE snapshot_session_id = v_snapshot.id;
  IF v_response_count <> 15 OR v_answered_count < 12 THEN
    RAISE EXCEPTION 'SNAPSHOT_INCOMPLETE';
  END IF;
  IF EXISTS (
    SELECT domain_id FROM (
      VALUES
        ('direction_value', ARRAY['strategic_alignment','portfolio_prioritisation','benefits_value']::text[]),
        ('leadership_governance', ARRAY['sponsorship_accountability','governance_decision_making','risk_assurance_resilience']::text[]),
        ('delivery_system', ARRAY['delivery_approach_lifecycle','planning_control_dependencies','capacity_delivery_ecosystem']::text[]),
        ('people_enablement', ARRAY['leadership_culture_collaboration','stakeholder_change_adoption','delivery_capability_enablement']::text[]),
        ('insight_adaptation', ARRAY['data_reporting_decision_insight','learning_adaptability_improvement','digital_automation_responsible_ai']::text[])
    ) AS domains(domain_id, capability_ids)
    WHERE (
      SELECT count(*) FROM public.delivery_dna_snapshot_responses response
      WHERE response.snapshot_session_id = v_snapshot.id
        AND response.evidence_status = 'answered'
        AND response.capability_id = ANY(domains.capability_ids)
    ) < 2
  ) THEN
    RAISE EXCEPTION 'SNAPSHOT_INCOMPLETE';
  END IF;

  INSERT INTO public.assessment_sessions (
    owner_key, organisation_id, workspace_id, created_by_user_id, organisation_name,
    assessment_type, metadata, status, current_section, progress, consent_basis
  ) VALUES (
    p_user_id::text || ':' || p_workspace_id::text,
    p_organisation_id, p_workspace_id, p_user_id, trim(v_snapshot.scope_display_name),
    'delivery-dna',
    p_manifest_metadata || jsonb_build_object('assessmentScope', jsonb_build_object(
      'scopeId', v_snapshot.id,
      'scopeType', v_snapshot.scope_type,
      'scopeDisplayName', v_snapshot.scope_display_name,
      'parentOrganisationId', p_organisation_id
    )),
    'in_progress', 'strategic_alignment', 33,
    'delivery_dna_snapshot_continuation'
  ) RETURNING id INTO v_assessment_id;

  INSERT INTO public.assessment_responses (
    session_id, question_id, section_id, value, score, notes, answered_at, evidence_at,
    evidence_status, evidence_reason_code, evidence_reason_text,
    provenance_source, provenance_version, original_responded_at
  )
  SELECT
    v_assessment_id, question_id, capability_id, to_jsonb(answer), answer, NULL, responded_at,
    CASE WHEN evidence_status = 'answered' THEN responded_at ELSE NULL END,
    evidence_status, not_applicable_reason_code, not_applicable_reason_text,
    'delivery-dna-snapshot', '2.0.0', responded_at
  FROM public.delivery_dna_snapshot_responses
  WHERE snapshot_session_id = v_snapshot.id
  ORDER BY capability_order;

  UPDATE public.delivery_dna_snapshot_sessions SET
    status = 'linked', linked_at = now(), linked_user_id = p_user_id,
    organisation_id = p_organisation_id, workspace_id = p_workspace_id,
    assessment_session_id = v_assessment_id, linking_consent_at = now()
  WHERE id = v_snapshot.id;
  RETURN v_assessment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_completed_assessment_analysis()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
  v_configuration_set_id text;
BEGIN
  IF NEW.status <> 'completed' OR NEW.completed_at IS NULL OR NEW.is_deleted
     OR NEW.organisation_id IS NULL OR NEW.workspace_id IS NULL
     OR NEW.created_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed'
     AND OLD.assessment_revision = NEW.assessment_revision THEN
    RETURN NEW;
  END IF;
  v_configuration_set_id := COALESCE(
    NEW.metadata #>> '{deliveryDna,configurationSetId}',
    'sprint03-product-config-1.0.0'
  );
  INSERT INTO public.assessment_analysis_handoffs (
    assessment_session_id, organisation_id, workspace_id, assessment_revision,
    configuration_set_id, requested_mode
  ) VALUES (
    NEW.id, NEW.organisation_id, NEW.workspace_id, NEW.assessment_revision,
    v_configuration_set_id, 'workspace'
  )
  ON CONFLICT (assessment_session_id, assessment_revision, configuration_set_id, requested_mode)
  DO UPDATE SET updated_at = now()
  RETURNING * INTO v_handoff;
  INSERT INTO public.assessment_analysis_handoff_events (
    handoff_id, assessment_session_id, organisation_id, workspace_id,
    correlation_id, event_type, payload
  ) VALUES (
    v_handoff.id, NEW.id, NEW.organisation_id, NEW.workspace_id,
    v_handoff.correlation_id, 'assessment.completion_committed',
    jsonb_build_object(
      'assessmentRevision', NEW.assessment_revision,
      'configurationSetId', v_handoff.configuration_set_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_assessment_analysis_handoffs(
  p_limit integer DEFAULT 100
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  WITH eligible AS (
    SELECT s.*,
      COALESCE(s.metadata #>> '{deliveryDna,configurationSetId}', 'sprint03-product-config-1.0.0')
        AS resolved_configuration_set_id
    FROM public.assessment_sessions s
    WHERE s.status = 'completed' AND s.completed_at IS NOT NULL AND s.is_deleted = false
      AND s.organisation_id IS NOT NULL AND s.workspace_id IS NOT NULL
      AND s.created_by_user_id IS NOT NULL
  ), inserted AS (
    INSERT INTO public.assessment_analysis_handoffs (
      assessment_session_id, organisation_id, workspace_id, assessment_revision,
      configuration_set_id, requested_mode
    )
    SELECT s.id, s.organisation_id, s.workspace_id, s.assessment_revision,
      s.resolved_configuration_set_id, 'workspace'::public.analysis_requested_mode
    FROM eligible s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.assessment_analysis_runs r
      WHERE r.assessment_session_id = s.id
        AND r.assessment_revision = s.assessment_revision
        AND r.configuration_set_id = s.resolved_configuration_set_id
        AND r.requested_mode = 'workspace'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.assessment_analysis_handoffs h
      WHERE h.assessment_session_id = s.id
        AND h.assessment_revision = s.assessment_revision
        AND h.configuration_set_id = s.resolved_configuration_set_id
        AND h.requested_mode = 'workspace'
    )
    ORDER BY s.completed_at
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_delivery_dna_snapshot_v2(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.enqueue_completed_assessment_analysis(),
  public.reconcile_assessment_analysis_handoffs(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v2(text, text, text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.reconcile_assessment_analysis_handoffs(integer)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text) FROM service_role;

COMMENT ON FUNCTION public.create_delivery_dna_snapshot_v2(text, text, text, text) IS
  'Creates only Delivery DNA Snapshot 2.0 sessions. Historical 1.x sessions are never upgraded.';
