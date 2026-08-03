-- Preserve the Delivery DNA Snapshot continuation contract while converting
-- the locked integer answer into assessment_responses.value's JSONB type.
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
  IF v_snapshot.id IS NULL OR v_snapshot.status = 'in_progress' OR v_snapshot.expires_at <= now() THEN
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
  IF v_response_count <> 13 OR v_answered_count < 9 THEN
    RAISE EXCEPTION 'SNAPSHOT_INCOMPLETE';
  END IF;

  INSERT INTO public.assessment_sessions (
    owner_key, organisation_id, workspace_id, created_by_user_id, organisation_name,
    assessment_type, metadata, status, current_section, progress, consent_basis
  ) VALUES (
    p_user_id::text || ':' || p_workspace_id::text,
    p_organisation_id, p_workspace_id, p_user_id, trim(p_organisation_name),
    'delivery-dna', p_manifest_metadata, 'in_progress', 'strategy_alignment', 33,
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
    'delivery-dna-snapshot', '1.0.0', responded_at
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

REVOKE ALL ON FUNCTION public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean)
  TO service_role;
