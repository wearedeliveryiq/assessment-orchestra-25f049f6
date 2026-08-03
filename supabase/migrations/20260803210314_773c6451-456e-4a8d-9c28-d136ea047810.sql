CREATE TABLE public.delivery_dna_snapshot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'linked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  completed_at timestamptz,
  linked_at timestamptz,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  assessment_session_id uuid UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  linking_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_dna_snapshot_retention CHECK (expires_at = created_at + interval '24 hours'),
  CONSTRAINT delivery_dna_snapshot_terminal_state CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND linked_at IS NULL AND assessment_session_id IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND linked_at IS NULL AND assessment_session_id IS NULL)
    OR (
      status = 'linked' AND completed_at IS NOT NULL AND linked_at IS NOT NULL
      AND linked_user_id IS NOT NULL AND organisation_id IS NOT NULL AND workspace_id IS NOT NULL
      AND assessment_session_id IS NOT NULL AND linking_consent_at IS NOT NULL
    )
  )
);

CREATE TABLE public.delivery_dna_snapshot_responses (
  snapshot_session_id uuid NOT NULL REFERENCES public.delivery_dna_snapshot_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL CHECK (question_id ~ '^ddna\.[a-z_]+\.p$'),
  capability_id text NOT NULL,
  capability_order integer NOT NULL CHECK (capability_order BETWEEN 1 AND 13),
  evidence_status text NOT NULL CHECK (evidence_status IN ('answered', 'not_applicable')),
  answer integer CHECK (answer BETWEEN 1 AND 5),
  not_applicable_reason_code text,
  not_applicable_reason_text text CHECK (not_applicable_reason_text IS NULL OR length(not_applicable_reason_text) BETWEEN 1 AND 500),
  responded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_session_id, question_id),
  UNIQUE (snapshot_session_id, capability_order),
  CONSTRAINT delivery_dna_snapshot_exact_manifest CHECK (
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
  ),
  CONSTRAINT delivery_dna_snapshot_response_semantics CHECK (
    (evidence_status = 'answered' AND answer IS NOT NULL AND not_applicable_reason_code IS NULL AND not_applicable_reason_text IS NULL)
    OR (
      evidence_status = 'not_applicable' AND answer IS NULL
      AND not_applicable_reason_code = 'customer_declared_not_applicable'
      AND not_applicable_reason_text IS NOT NULL
    )
  )
);

CREATE TABLE public.delivery_dna_snapshot_funnel_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'snapshot_landing_viewed', 'snapshot_started', 'snapshot_step_progressed',
    'snapshot_completed', 'snapshot_continue_selected', 'snapshot_registration_completed'
  )),
  step_number integer CHECK (step_number IS NULL OR step_number BETWEEN 1 AND 13),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_dna_snapshot_access_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_responses
  ADD COLUMN provenance_source text,
  ADD COLUMN provenance_version text,
  ADD COLUMN original_responded_at timestamptz,
  ADD CONSTRAINT assessment_response_snapshot_provenance CHECK (
    (provenance_source IS NULL AND provenance_version IS NULL AND original_responded_at IS NULL)
    OR (
      provenance_source = 'delivery-dna-snapshot'
      AND provenance_version = '1.0.0'
      AND original_responded_at IS NOT NULL
    )
  );

CREATE INDEX delivery_dna_snapshot_expiry_idx
  ON public.delivery_dna_snapshot_sessions (expires_at)
  WHERE status <> 'linked';
CREATE INDEX delivery_dna_snapshot_access_time_idx
  ON public.delivery_dna_snapshot_access_events (ip_hash, occurred_at DESC);
CREATE INDEX delivery_dna_snapshot_funnel_time_idx
  ON public.delivery_dna_snapshot_funnel_events (event_type, occurred_at DESC);

CREATE TRIGGER delivery_dna_snapshot_sessions_updated_at
BEFORE UPDATE ON public.delivery_dna_snapshot_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER delivery_dna_snapshot_responses_updated_at
BEFORE UPDATE ON public.delivery_dna_snapshot_responses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER delivery_dna_snapshot_funnel_immutable
BEFORE UPDATE OR DELETE ON public.delivery_dna_snapshot_funnel_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
-- Access records contain only an irreversible network hash and timestamp. They
-- are service-role-only, but deliberately remain deletable by the bounded
-- cleanup routine so operational abuse data follows the same 24-hour window as
-- an unlinked Snapshot. Funnel events remain immutable and contain no identity.

CREATE OR REPLACE FUNCTION public.create_delivery_dna_snapshot(p_token_hash text, p_ip_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'SNAPSHOT_REQUEST_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  IF (SELECT count(*) FROM public.delivery_dna_snapshot_access_events WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 minute') >= 60
     OR (SELECT count(*) FROM public.delivery_dna_snapshot_access_events WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 day') >= 1000 THEN
    RAISE EXCEPTION 'SNAPSHOT_RATE_LIMITED';
  END IF;
  INSERT INTO public.delivery_dna_snapshot_access_events (ip_hash) VALUES (p_ip_hash);
  INSERT INTO public.delivery_dna_snapshot_sessions (token_hash) VALUES (p_token_hash) RETURNING id INTO v_id;
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
    v_assessment_id, question_id, capability_id, answer, answer, NULL, responded_at,
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

CREATE OR REPLACE FUNCTION public.cleanup_expired_delivery_dna_snapshots(p_limit integer DEFAULT 200)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    SELECT id FROM public.delivery_dna_snapshot_sessions
    WHERE status <> 'linked' AND expires_at <= now()
    ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ), deleted AS (
    DELETE FROM public.delivery_dna_snapshot_sessions snapshot USING expired
    WHERE snapshot.id = expired.id RETURNING snapshot.id
  ) SELECT count(*) INTO v_count FROM deleted;
  DELETE FROM public.delivery_dna_snapshot_access_events WHERE occurred_at <= now() - interval '24 hours';
  RETURN v_count;
END;
$$;

ALTER TABLE public.delivery_dna_snapshot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_access_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.delivery_dna_snapshot_sessions, public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events, public.delivery_dna_snapshot_access_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer) FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.delivery_dna_snapshot_sessions, public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events, public.delivery_dna_snapshot_access_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_snapshot_funnel_events_id_seq,
  public.delivery_dna_snapshot_access_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer) TO service_role;