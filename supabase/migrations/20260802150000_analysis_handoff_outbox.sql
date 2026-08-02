CREATE TYPE public.analysis_handoff_status AS ENUM ('pending', 'processing', 'delivered', 'failed');

CREATE TABLE public.assessment_analysis_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  assessment_revision integer NOT NULL CHECK (assessment_revision > 0),
  configuration_set_id text NOT NULL,
  requested_mode public.analysis_requested_mode NOT NULL DEFAULT 'workspace',
  status public.analysis_handoff_status NOT NULL DEFAULT 'pending',
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 10),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_run_id uuid REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  last_error_code text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_session_id, assessment_revision, configuration_set_id, requested_mode),
  CONSTRAINT assessment_analysis_handoff_tenant_match CHECK (
    organisation_id IS NOT NULL AND workspace_id IS NOT NULL
  ),
  CONSTRAINT assessment_analysis_handoff_terminal_state CHECK (
    (status = 'delivered' AND analysis_run_id IS NOT NULL AND delivered_at IS NOT NULL)
    OR (status <> 'delivered' AND delivered_at IS NULL)
  )
);

CREATE INDEX assessment_analysis_handoffs_claim_idx
  ON public.assessment_analysis_handoffs (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX assessment_analysis_handoffs_tenant_idx
  ON public.assessment_analysis_handoffs (organisation_id, workspace_id, assessment_session_id);

CREATE TABLE public.assessment_analysis_handoff_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  handoff_id uuid NOT NULL REFERENCES public.assessment_analysis_handoffs(id) ON DELETE RESTRICT,
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  correlation_id uuid NOT NULL,
  event_type text NOT NULL,
  safe_error_code text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_analysis_handoff_events_tenant_idx
  ON public.assessment_analysis_handoff_events
  (organisation_id, workspace_id, assessment_session_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enqueue_completed_assessment_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  IF NEW.status <> 'completed'
     OR NEW.completed_at IS NULL
     OR NEW.is_deleted
     OR NEW.organisation_id IS NULL
     OR NEW.workspace_id IS NULL
     OR NEW.created_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed'
     AND OLD.assessment_revision = NEW.assessment_revision THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.assessment_analysis_handoffs (
    assessment_session_id, organisation_id, workspace_id, assessment_revision,
    configuration_set_id, requested_mode
  ) VALUES (
    NEW.id, NEW.organisation_id, NEW.workspace_id, NEW.assessment_revision,
    'sprint03-product-config-1.0.0', 'workspace'
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

CREATE TRIGGER assessment_completion_analysis_outbox
AFTER INSERT OR UPDATE OF status, completed_at, assessment_revision
ON public.assessment_sessions
FOR EACH ROW EXECUTE FUNCTION public.enqueue_completed_assessment_analysis();

CREATE OR REPLACE FUNCTION public.claim_assessment_analysis_handoffs(
  p_limit integer DEFAULT 10
)
RETURNS SETOF public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.assessment_analysis_handoffs
    WHERE (
        (status IN ('pending', 'failed') AND next_attempt_at <= now())
        OR (status = 'processing' AND claimed_at <= now() - interval '2 minutes')
      )
      AND attempt < 10
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.assessment_analysis_handoffs h
  SET status = 'processing', attempt = h.attempt + 1, claimed_at = now(), updated_at = now()
  FROM candidates c
  WHERE h.id = c.id
  RETURNING h.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_assessment_analysis_handoff(
  p_handoff_id uuid,
  p_analysis_run_id uuid
)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs
  SET status = 'delivered', analysis_run_id = p_analysis_run_id,
      last_error_code = NULL, delivered_at = now(), updated_at = now()
  WHERE id = p_handoff_id AND status = 'processing'
  RETURNING * INTO v_handoff;
  IF v_handoff.id IS NULL THEN RAISE EXCEPTION 'ANALYSIS_HANDOFF_NOT_CLAIMED'; END IF;
  RETURN v_handoff;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_assessment_analysis_handoff(p_handoff_id uuid)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs
  SET status = 'processing', attempt = attempt + 1, claimed_at = now(), updated_at = now()
  WHERE id = p_handoff_id
    AND (
      status IN ('pending', 'failed')
      OR (status = 'processing' AND claimed_at <= now() - interval '2 minutes')
    )
    AND attempt < 10
  RETURNING * INTO v_handoff;
  RETURN v_handoff;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_assessment_analysis_handoff(
  p_handoff_id uuid,
  p_safe_error_code text
)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs
  SET status = 'failed', last_error_code = left(coalesce(p_safe_error_code, 'ANALYSIS_HANDOFF_FAILED'), 120),
      next_attempt_at = now() + CASE WHEN attempt <= 1 THEN interval '5 seconds'
                                    WHEN attempt = 2 THEN interval '30 seconds'
                                    ELSE interval '60 seconds' END,
      claimed_at = NULL, updated_at = now()
  WHERE id = p_handoff_id AND status = 'processing'
  RETURNING * INTO v_handoff;
  IF v_handoff.id IS NULL THEN RAISE EXCEPTION 'ANALYSIS_HANDOFF_NOT_CLAIMED'; END IF;
  RETURN v_handoff;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_assessment_analysis_handoffs(
  p_limit integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH inserted AS (
    INSERT INTO public.assessment_analysis_handoffs (
      assessment_session_id, organisation_id, workspace_id, assessment_revision,
      configuration_set_id, requested_mode
    )
    SELECT s.id, s.organisation_id, s.workspace_id, s.assessment_revision,
           'sprint03-product-config-1.0.0', 'workspace'::public.analysis_requested_mode
    FROM public.assessment_sessions s
    WHERE s.status = 'completed'
      AND s.completed_at IS NOT NULL
      AND s.is_deleted = false
      AND s.organisation_id IS NOT NULL
      AND s.workspace_id IS NOT NULL
      AND s.created_by_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.assessment_analysis_runs r
        WHERE r.assessment_session_id = s.id
          AND r.assessment_revision = s.assessment_revision
          AND r.configuration_set_id = 'sprint03-product-config-1.0.0'
          AND r.requested_mode = 'workspace'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.assessment_analysis_handoffs h
        WHERE h.assessment_session_id = s.id
          AND h.assessment_revision = s.assessment_revision
          AND h.configuration_set_id = 'sprint03-product-config-1.0.0'
          AND h.requested_mode = 'workspace'
      )
    ORDER BY s.completed_at
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
    ON CONFLICT DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;

CREATE TRIGGER assessment_analysis_handoffs_updated_at
BEFORE UPDATE ON public.assessment_analysis_handoffs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assessment_analysis_handoff_events_immutable
BEFORE UPDATE OR DELETE ON public.assessment_analysis_handoff_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.assessment_analysis_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_analysis_handoff_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.assessment_analysis_handoffs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.assessment_analysis_handoff_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.assessment_analysis_handoff_events_id_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assessment_analysis_handoffs TO service_role;
GRANT ALL ON public.assessment_analysis_handoff_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assessment_analysis_handoff_events_id_seq TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_completed_assessment_analysis() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_assessment_analysis_handoff(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_assessment_analysis_handoff(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_assessment_analysis_handoffs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_assessment_analysis_handoff(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_assessment_analysis_handoff(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_assessment_analysis_handoffs(integer) TO service_role;

COMMENT ON TABLE public.assessment_analysis_handoffs IS
  'Durable PDR-003-001 completion-to-analysis outbox; contains no raw assessment evidence.';
COMMENT ON TABLE public.assessment_analysis_handoff_events IS
  'Append-only, tenant-scoped PDR-003-001 hand-off lifecycle events.';

-- Operational backfill: enqueue existing completed assessments without a governed run.
SELECT public.reconcile_assessment_analysis_handoffs(1000);
