-- Delivery DNA 2.2 language and Snapshot-experience cutover. Historical
-- 1.x, 2.0 and 2.1 records remain immutable and are never translated.

ALTER TABLE public.delivery_dna_snapshot_sessions
  DROP CONSTRAINT delivery_dna_snapshot_configuration_version,
  DROP CONSTRAINT delivery_dna_snapshot_presentation_policy_version,
  ADD CONSTRAINT delivery_dna_snapshot_configuration_version
    CHECK (configuration_version IN ('1.0.0', '1.1.0', '2.0.0', '2.1.0', '2.2.0')),
  ADD CONSTRAINT delivery_dna_snapshot_presentation_policy_version
    CHECK (presentation_policy_version IN ('1.0.0', '1.1.0', '2.0.0', '2.1.0', '2.1.1', '2.2.0'));

ALTER TABLE public.assessment_responses
  DROP CONSTRAINT assessment_response_snapshot_provenance,
  ADD CONSTRAINT assessment_response_snapshot_provenance CHECK (
    (provenance_source IS NULL AND provenance_version IS NULL AND original_responded_at IS NULL)
    OR (
      provenance_source = 'delivery-dna-snapshot'
      AND provenance_version IN ('1.0.0', '1.1.0', '2.0.0', '2.1.0', '2.2.0')
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
  IF OLD.configuration_version IN ('2.0.0', '2.1.0', '2.2.0')
     AND (
       NEW.scope_type IS DISTINCT FROM OLD.scope_type
       OR NEW.scope_display_name IS DISTINCT FROM OLD.scope_display_name
     ) THEN
    RAISE EXCEPTION 'SNAPSHOT_SCOPE_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_delivery_dna_snapshot_v22(
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
    p_token_hash, '2.2.0', '2.2.0', p_scope_type, trim(p_scope_display_name)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_delivery_dna_snapshot_v22(
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
  IF p_manifest_metadata #>> '{deliveryDna,assessmentType}' <> 'delivery-dna'
     OR p_manifest_metadata #>> '{deliveryDna,knowledgePackId}' <> 'delivery-dna'
     OR p_manifest_metadata #>> '{deliveryDna,knowledgePackVersion}' <> '2.2.0'
     OR p_manifest_metadata #>> '{deliveryDna,questionSetId}' <> 'delivery-dna'
     OR p_manifest_metadata #>> '{deliveryDna,questionSetVersion}' <> '2.2.0'
     OR p_manifest_metadata #>> '{deliveryDna,configurationSetId}' <> 'delivery-dna-product-config-2.2.0'
     OR jsonb_typeof(p_manifest_metadata #> '{deliveryDna,questionManifest}') IS DISTINCT FROM 'array'
     OR (CASE
          WHEN jsonb_typeof(p_manifest_metadata #> '{deliveryDna,questionManifest}') = 'array'
          THEN jsonb_array_length(p_manifest_metadata #> '{deliveryDna,questionManifest}')
          ELSE 0
        END) <> 45
     OR COALESCE(p_manifest_metadata #>> '{deliveryDna,questionManifestDigest}', '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'SNAPSHOT_LINK_UNAVAILABLE';
  END IF;
  SELECT * INTO v_snapshot FROM public.delivery_dna_snapshot_sessions
    WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_snapshot.id IS NULL OR v_snapshot.configuration_version <> '2.2.0'
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
    'delivery-dna-snapshot', '2.2.0', responded_at
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

REVOKE ALL ON FUNCTION public.create_delivery_dna_snapshot_v22(text, text, text, text),
  public.link_delivery_dna_snapshot_v22(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v22(text, text, text, text),
  public.link_delivery_dna_snapshot_v22(text, uuid, uuid, uuid, text, jsonb, boolean)
  TO service_role;

-- Disable new collection/linking for superseded versions without deleting history.
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.create_delivery_dna_snapshot_v2(text, text, text, text),
  public.create_delivery_dna_snapshot_v21(text, text, text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.link_delivery_dna_snapshot_v21(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_delivery_dna_snapshot_v22(text, text, text, text) IS
  'Creates only Delivery DNA Snapshot 2.2 sessions. Historical sessions are never upgraded.';
COMMENT ON FUNCTION public.link_delivery_dna_snapshot_v22(text, uuid, uuid, uuid, text, jsonb, boolean) IS
  'Links only completed Delivery DNA Snapshot 2.2 sessions after consent and tenant verification.';
