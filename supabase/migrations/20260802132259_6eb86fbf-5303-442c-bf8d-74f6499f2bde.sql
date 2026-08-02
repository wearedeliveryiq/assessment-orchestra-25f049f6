-- Sprint 03: tenant-scoped, immutable, asynchronous Delivery Intelligence runs.
CREATE TYPE public.analysis_run_status AS ENUM ('queued', 'running', 'completed', 'failed');
CREATE TYPE public.analysis_requested_mode AS ENUM ('workspace', 'public');

ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS assessment_revision integer NOT NULL DEFAULT 1
    CHECK (assessment_revision > 0),
  ADD COLUMN IF NOT EXISTS consent_basis text NOT NULL DEFAULT 'authenticated_assessment_submission';

ALTER TABLE public.assessment_responses
  ADD COLUMN IF NOT EXISTS evidence_status text NOT NULL DEFAULT 'answered'
    CHECK (evidence_status IN ('answered', 'not_applicable', 'excluded', 'missing')),
  ADD COLUMN IF NOT EXISTS exclusion_reason text,
  ADD COLUMN IF NOT EXISTS respondent_group_id text,
  ADD COLUMN IF NOT EXISTS evidence_at timestamptz;

CREATE TABLE public.assessment_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  runtime_execution_id uuid NOT NULL REFERENCES public.runtime_executions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assessment_revision integer NOT NULL CHECK (assessment_revision > 0),
  requested_mode public.analysis_requested_mode NOT NULL,
  status public.analysis_run_status NOT NULL DEFAULT 'queued',
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 3),
  knowledge_pack_id text NOT NULL,
  knowledge_pack_version text NOT NULL,
  question_set_version text NOT NULL,
  configuration_set_id text NOT NULL,
  configuration_version text NOT NULL,
  configuration_digest text NOT NULL CHECK (configuration_digest ~ '^[0-9a-f]{64}$'),
  configuration_snapshot jsonb NOT NULL,
  schema_version text NOT NULL,
  engine_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL UNIQUE,
  response_count integer NOT NULL CHECK (response_count > 0),
  canonical_input jsonb NOT NULL,
  initiator jsonb NOT NULL,
  consent_basis text NOT NULL,
  correlation_id text NOT NULL,
  error_code text,
  safe_error_message text,
  retryable boolean,
  lease_owner text,
  lease_expires_at timestamptz,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_analysis_runs_tenant_match CHECK (
    canonical_input #>> '{assessment,organisationId}' = organisation_id::text
    AND canonical_input #>> '{assessment,workspaceId}' = workspace_id::text
    AND canonical_input #>> '{assessment,sessionId}' = assessment_session_id::text
    AND (canonical_input #>> '{assessment,revision}')::integer = assessment_revision
  ),
  CONSTRAINT assessment_analysis_runs_terminal_time CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND failed_at IS NULL)
    OR (status = 'failed' AND failed_at IS NOT NULL AND completed_at IS NULL)
    OR (status IN ('queued', 'running') AND completed_at IS NULL AND failed_at IS NULL)
  )
);

CREATE INDEX assessment_analysis_runs_session_idx
  ON public.assessment_analysis_runs (assessment_session_id, assessment_revision DESC, created_at DESC);
CREATE INDEX assessment_analysis_runs_tenant_idx
  ON public.assessment_analysis_runs (organisation_id, workspace_id, created_at DESC);
CREATE INDEX assessment_analysis_runs_claim_idx
  ON public.assessment_analysis_runs (status, queued_at)
  WHERE status = 'queued';

CREATE TABLE public.assessment_analysis_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  correlation_id text NOT NULL,
  event_type text NOT NULL,
  sequence integer NOT NULL DEFAULT 0 CHECK (sequence > 0),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_run_id, sequence)
);

CREATE INDEX assessment_analysis_events_tenant_run_idx
  ON public.assessment_analysis_events (organisation_id, workspace_id, analysis_run_id, sequence);

CREATE FUNCTION public.assign_analysis_event_sequence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.analysis_run_id::text, 0));
  SELECT COALESCE(MAX(sequence), 0) + 1 INTO NEW.sequence
  FROM public.assessment_analysis_events WHERE analysis_run_id = NEW.analysis_run_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_analysis_event_sequence
  BEFORE INSERT ON public.assessment_analysis_events
  FOR EACH ROW EXECUTE FUNCTION public.assign_analysis_event_sequence();

CREATE FUNCTION public.enforce_analysis_run_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('running', 'completed') AND (
    NEW.canonical_input IS DISTINCT FROM OLD.canonical_input OR
    NEW.configuration_snapshot IS DISTINCT FROM OLD.configuration_snapshot OR
    NEW.input_hash IS DISTINCT FROM OLD.input_hash OR
    NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
    NEW.assessment_revision IS DISTINCT FROM OLD.assessment_revision OR
    NEW.configuration_digest IS DISTINCT FROM OLD.configuration_digest OR
    NEW.engine_version IS DISTINCT FROM OLD.engine_version OR
    NEW.schema_version IS DISTINCT FROM OLD.schema_version
  ) THEN
    RAISE EXCEPTION 'analysis snapshots are immutable after execution begins';
  END IF;
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'completed analysis runs are immutable';
  END IF;
  IF NOT (
    (OLD.status = 'queued' AND NEW.status IN ('queued', 'running', 'failed')) OR
    (OLD.status = 'running' AND NEW.status IN ('running', 'completed', 'failed')) OR
    (OLD.status = 'failed' AND NEW.status IN ('failed', 'queued'))
  ) THEN
    RAISE EXCEPTION 'invalid analysis run transition % -> %', OLD.status, NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_analysis_runs_transition
  BEFORE UPDATE ON public.assessment_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_analysis_run_transition();

CREATE TRIGGER assessment_analysis_runs_no_delete
  BEFORE DELETE ON public.assessment_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER assessment_analysis_events_immutable
  BEFORE UPDATE OR DELETE ON public.assessment_analysis_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.assessment_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_analysis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read tenant analysis runs"
  ON public.assessment_analysis_runs FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships membership
      WHERE membership.organisation_id = assessment_analysis_runs.organisation_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active' AND membership.is_deleted = false
    ) AND EXISTS (
      SELECT 1 FROM public.workspaces workspace
      WHERE workspace.id = assessment_analysis_runs.workspace_id
        AND workspace.organisation_id = assessment_analysis_runs.organisation_id
        AND workspace.is_deleted = false
    )
  );

CREATE POLICY "Members can read tenant analysis events"
  ON public.assessment_analysis_events FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.assessment_analysis_runs run
      WHERE run.id = assessment_analysis_events.analysis_run_id
        AND run.organisation_id = assessment_analysis_events.organisation_id
        AND run.workspace_id = assessment_analysis_events.workspace_id
        AND EXISTS (
          SELECT 1 FROM public.organisation_memberships membership
          WHERE membership.organisation_id = run.organisation_id
            AND membership.user_id = auth.uid()
            AND membership.status = 'active'
            AND membership.is_deleted = false
        )
        AND EXISTS (
          SELECT 1 FROM public.workspaces workspace
          WHERE workspace.id = run.workspace_id
            AND workspace.organisation_id = run.organisation_id
            AND workspace.is_deleted = false
        )
    )
  );

GRANT SELECT ON public.assessment_analysis_runs, public.assessment_analysis_events TO authenticated;
GRANT ALL ON public.assessment_analysis_runs, public.assessment_analysis_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assessment_analysis_events_id_seq TO service_role;

COMMENT ON TABLE public.assessment_analysis_runs IS
  'Version-pinned canonical input and asynchronous lifecycle for Sprint 03. Completed rows are immutable.';
COMMENT ON TABLE public.assessment_analysis_events IS
  'Append-only, tenant-scoped structured lifecycle events for analysis runs.';

-- Atomic worker transitions are service-role-only. A lease-expired worker is
-- reclaimed as the next attempt on the same immutable run.
CREATE FUNCTION public.claim_assessment_analysis_run(
  p_run_id uuid,
  p_lease_owner text,
  p_lease_seconds integer DEFAULT 120
)
RETURNS SETOF public.assessment_analysis_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_lease_owner IS NULL OR length(p_lease_owner) < 1 OR p_lease_seconds NOT BETWEEN 15 AND 900 THEN
    RAISE EXCEPTION 'invalid analysis lease';
  END IF;
  RETURN QUERY
  UPDATE public.assessment_analysis_runs run
  SET status = 'running',
      attempt = run.attempt + 1,
      lease_owner = p_lease_owner,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = COALESCE(run.started_at, now()),
      failed_at = NULL,
      error_code = NULL,
      safe_error_message = NULL,
      retryable = NULL
  WHERE run.id = p_run_id
    AND run.attempt < 3
    AND (
      run.status = 'queued'
      OR (run.status = 'running' AND run.lease_expires_at < now())
    )
  RETURNING run.*;
END;
$$;

CREATE FUNCTION public.complete_assessment_analysis_run(p_run_id uuid, p_lease_owner text)
RETURNS SETOF public.assessment_analysis_runs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.assessment_analysis_runs run
  SET status = 'completed', completed_at = now(), lease_owner = NULL, lease_expires_at = NULL
  WHERE run.id = p_run_id AND run.status = 'running' AND run.lease_owner = p_lease_owner
  RETURNING run.*;
$$;

CREATE FUNCTION public.fail_assessment_analysis_run(
  p_run_id uuid,
  p_lease_owner text,
  p_error_code text,
  p_safe_message text,
  p_retryable boolean
)
RETURNS SETOF public.assessment_analysis_runs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.assessment_analysis_runs run
  SET status = 'failed', failed_at = now(), error_code = p_error_code,
      safe_error_message = p_safe_message, retryable = p_retryable,
      lease_owner = NULL, lease_expires_at = NULL
  WHERE run.id = p_run_id AND run.status = 'running' AND run.lease_owner = p_lease_owner
  RETURNING run.*;
$$;

CREATE FUNCTION public.retry_assessment_analysis_run(p_run_id uuid)
RETURNS SETOF public.assessment_analysis_runs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.assessment_analysis_runs run
  SET status = 'queued', queued_at = now(), failed_at = NULL,
      error_code = NULL, safe_error_message = NULL, retryable = NULL
  WHERE run.id = p_run_id AND run.status = 'failed'
    AND run.retryable = true AND run.attempt < 3
  RETURNING run.*;
$$;

REVOKE ALL ON FUNCTION public.claim_assessment_analysis_run(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_assessment_analysis_run(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_assessment_analysis_run(uuid, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.retry_assessment_analysis_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_run(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_assessment_analysis_run(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_assessment_analysis_run(uuid, text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_assessment_analysis_run(uuid) TO service_role;