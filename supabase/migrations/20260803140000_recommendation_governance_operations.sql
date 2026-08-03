CREATE TYPE public.recommendation_audit_export_status AS ENUM (
  'queued', 'processing', 'completed', 'failed', 'expired'
);
CREATE TYPE public.recommendation_integrity_status AS ENUM ('passed', 'failed');
CREATE TYPE public.recommendation_operational_severity AS ENUM ('info', 'warning', 'critical');

CREATE TABLE public.recommendation_feature_flag_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL CHECK (feature_key = 'audit_exports'),
  enabled boolean NOT NULL,
  feature_version integer NOT NULL CHECK (feature_version > 0),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason_category text NOT NULL CHECK (
    reason_category IN ('release_gate','incident','rollback','recovery')
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, feature_version)
);

CREATE TABLE public.recommendation_audit_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  projection text NOT NULL CHECK (projection = 'tenant_audit'),
  status public.recommendation_audit_export_status NOT NULL DEFAULT 'queued',
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 3),
  retryable boolean NOT NULL DEFAULT true,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  lease_owner text,
  lease_expires_at timestamptz,
  export_payload jsonb,
  payload_hash text CHECK (payload_hash IS NULL OR payload_hash ~ '^[0-9a-f]{64}$'),
  failure_code text CHECK (failure_code IS NULL OR length(failure_code) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  available_until timestamptz,
  resolved_at timestamptz,
  UNIQUE (organisation_id, workspace_id, idempotency_key),
  CONSTRAINT recommendation_audit_export_terminal_state CHECK (
    (status = 'queued' AND lease_owner IS NULL AND lease_expires_at IS NULL
      AND completed_at IS NULL AND available_until IS NULL AND export_payload IS NULL
      AND payload_hash IS NULL AND failure_code IS NULL AND resolved_at IS NULL)
    OR (status = 'processing' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL
      AND started_at IS NOT NULL AND completed_at IS NULL AND available_until IS NULL
      AND export_payload IS NULL AND payload_hash IS NULL AND failure_code IS NULL
      AND resolved_at IS NULL)
    OR (status = 'completed' AND lease_owner IS NULL AND lease_expires_at IS NULL
      AND completed_at IS NOT NULL AND available_until > completed_at
      AND export_payload IS NOT NULL AND payload_hash IS NOT NULL
      AND failure_code IS NULL AND resolved_at IS NOT NULL)
    OR (status = 'failed' AND lease_owner IS NULL AND lease_expires_at IS NULL
      AND completed_at IS NULL AND available_until IS NULL AND export_payload IS NULL
      AND payload_hash IS NULL AND failure_code IS NOT NULL AND resolved_at IS NOT NULL)
    OR (status = 'expired' AND lease_owner IS NULL AND lease_expires_at IS NULL
      AND completed_at IS NOT NULL AND available_until IS NOT NULL
      AND export_payload IS NULL AND payload_hash IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

CREATE TABLE public.recommendation_integrity_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  export_job_id uuid NOT NULL UNIQUE REFERENCES public.recommendation_audit_export_jobs(id) ON DELETE RESTRICT,
  status public.recommendation_integrity_status NOT NULL,
  checks jsonb NOT NULL CHECK (jsonb_typeof(checks) = 'object'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  checker_version text NOT NULL CHECK (checker_version = 'deliveryiq.recommendation-integrity/1.0.0'),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recommendation_operational_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'feature_flag_changed','audit_export_requested','audit_export_started',
    'audit_export_completed','audit_export_failed','audit_export_retried',
    'audit_export_accessed','integrity_passed','integrity_failed','recovery_rehearsed'
  )),
  severity public.recommendation_operational_severity NOT NULL,
  alert_code text CHECK (alert_code IS NULL OR alert_code IN (
    'promotion_failure','invalid_catalogue','orphan_lineage','dependency_cycle',
    'transition_conflict','command_failure','export_failure','tenant_denial',
    'handoff_abuse','latency'
  )),
  object_type text NOT NULL CHECK (
    object_type IN ('feature_flag','audit_export','portfolio','catalogue','recovery')
  ),
  object_id text NOT NULL CHECK (length(object_id) BETWEEN 1 AND 160),
  object_version text NOT NULL CHECK (length(object_version) BETWEEN 1 AND 100),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  categorical_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(categorical_metadata) = 'object'
    AND NOT (categorical_metadata ?| ARRAY[
      'raw_answer','answer','note','evidence','free_text','secret','token','prompt'
    ])
  ),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recommendation_audit_export_claim_idx
  ON public.recommendation_audit_export_jobs (status, created_at)
  WHERE status IN ('queued','processing');
CREATE INDEX recommendation_audit_export_tenant_idx
  ON public.recommendation_audit_export_jobs (
    organisation_id, workspace_id, portfolio_id, created_at DESC
  );
CREATE INDEX recommendation_integrity_tenant_idx
  ON public.recommendation_integrity_results (
    organisation_id, workspace_id, portfolio_id, recorded_at DESC
  );
CREATE INDEX recommendation_operational_time_idx
  ON public.recommendation_operational_events (event_type, severity, occurred_at DESC);
CREATE INDEX recommendation_operational_tenant_idx
  ON public.recommendation_operational_events (
    organisation_id, workspace_id, occurred_at DESC
  );

CREATE TRIGGER recommendation_feature_flag_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_feature_flag_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_integrity_results_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_integrity_results
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_operational_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_operational_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_audit_export_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.recommendation_export_transition', true) <> 'on' THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_IMMUTABLE';
  END IF;
  IF OLD.status = 'completed' AND NEW.status NOT IN ('completed','expired') THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_IMMUTABLE';
  END IF;
  IF OLD.status = 'expired' THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_audit_export_transition
BEFORE UPDATE ON public.recommendation_audit_export_jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_audit_export_transition();
CREATE TRIGGER recommendation_audit_export_no_delete
BEFORE DELETE ON public.recommendation_audit_export_jobs
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.resolve_recommendation_feature_flag(p_feature_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((
    SELECT enabled FROM public.recommendation_feature_flag_events
    WHERE feature_key = p_feature_key
    ORDER BY feature_version DESC LIMIT 1
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.set_recommendation_feature_flag(p_input jsonb)
RETURNS public.recommendation_feature_flag_events
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.recommendation_feature_flag_events;
  v_result public.recommendation_feature_flag_events;
  v_key text := p_input ->> 'featureKey';
  v_actor uuid := (p_input ->> 'actorId')::uuid;
  v_idempotency text := p_input ->> 'idempotencyKey';
  v_hash text := p_input ->> 'requestHash';
  v_version integer;
BEGIN
  IF v_key <> 'audit_exports'
     OR jsonb_typeof(p_input -> 'enabled') <> 'boolean'
     OR p_input ->> 'reasonCategory' NOT IN ('release_gate','incident','rollback','recovery')
     OR length(v_idempotency) NOT BETWEEN 16 AND 160
     OR v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_FEATURE_FLAG_INVALID';
  END IF;
  IF NOT public.has_role(v_actor, 'product_governance'::public.platform_role) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('recommendation-feature:' || v_key, 0));
  SELECT * INTO v_existing FROM public.recommendation_feature_flag_events
    WHERE idempotency_key = v_idempotency;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION 'RECOMMENDATION_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_existing;
  END IF;
  SELECT coalesce(max(feature_version), 0) + 1 INTO v_version
  FROM public.recommendation_feature_flag_events WHERE feature_key = v_key;
  INSERT INTO public.recommendation_feature_flag_events (
    feature_key, enabled, feature_version, actor_user_id, reason_category,
    idempotency_key, request_hash
  ) VALUES (
    v_key, (p_input ->> 'enabled')::boolean, v_version, v_actor,
    p_input ->> 'reasonCategory', v_idempotency, v_hash
  ) RETURNING * INTO v_result;
  INSERT INTO public.recommendation_operational_events (
    actor_user_id, event_type, severity, object_type, object_id, object_version,
    categorical_metadata
  ) VALUES (
    v_actor, 'feature_flag_changed', 'info', 'feature_flag', v_key, v_version::text,
    jsonb_build_object('enabled', v_result.enabled, 'reasonCategory', v_result.reason_category)
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_recommendation_audit_export(p_input jsonb)
RETURNS public.recommendation_audit_export_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.recommendation_audit_export_jobs;
  v_result public.recommendation_audit_export_jobs;
  v_org uuid := (p_input ->> 'organisationId')::uuid;
  v_workspace uuid := (p_input ->> 'workspaceId')::uuid;
  v_portfolio uuid := (p_input ->> 'portfolioId')::uuid;
  v_actor uuid := (p_input ->> 'requestedBy')::uuid;
  v_idempotency text := p_input ->> 'idempotencyKey';
  v_hash text := p_input ->> 'requestHash';
BEGIN
  IF p_input ->> 'projection' <> 'tenant_audit'
     OR length(v_idempotency) NOT BETWEEN 16 AND 160
     OR v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_INVALID';
  END IF;
  IF NOT public.resolve_recommendation_feature_flag('audit_exports') THEN
    RAISE EXCEPTION 'RECOMMENDATION_FEATURE_DISABLED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships membership
    JOIN public.workspaces workspace ON workspace.id = v_workspace
    JOIN public.recommendation_portfolios portfolio ON portfolio.id = v_portfolio
    WHERE membership.organisation_id = v_org AND membership.user_id = v_actor
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace.organisation_id = v_org AND workspace.is_deleted = false
      AND portfolio.organisation_id = v_org AND portfolio.workspace_id = v_workspace
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('recommendation-export:' || v_org::text || ':' || v_idempotency, 0));
  SELECT * INTO v_existing FROM public.recommendation_audit_export_jobs
  WHERE organisation_id = v_org AND workspace_id = v_workspace
    AND idempotency_key = v_idempotency;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION 'RECOMMENDATION_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_existing;
  END IF;
  IF (
    SELECT count(*) FROM public.recommendation_audit_export_jobs
    WHERE organisation_id = v_org AND requested_by = v_actor
      AND created_at >= now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_RATE_LIMITED';
  END IF;
  INSERT INTO public.recommendation_audit_export_jobs (
    organisation_id, workspace_id, portfolio_id, requested_by, projection,
    idempotency_key, request_hash
  ) VALUES (
    v_org, v_workspace, v_portfolio, v_actor, 'tenant_audit', v_idempotency, v_hash
  ) RETURNING * INTO v_result;
  INSERT INTO public.recommendation_operational_events (
    organisation_id, workspace_id, actor_user_id, event_type, severity,
    object_type, object_id, object_version, categorical_metadata
  ) VALUES (
    v_org, v_workspace, v_actor, 'audit_export_requested', 'info',
    'audit_export', v_result.id::text, '1', jsonb_build_object('projection','tenant_audit')
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_recommendation_audit_exports(p_limit integer DEFAULT 10)
RETURNS SETOF public.recommendation_audit_export_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'RECOMMENDATION_EXPORT_LIMIT_INVALID'; END IF;
  PERFORM set_config('app.recommendation_export_transition', 'on', true);
  UPDATE public.recommendation_audit_export_jobs SET
    status = 'expired', export_payload = NULL
  WHERE status = 'completed' AND available_until <= now();
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.recommendation_audit_export_jobs
    WHERE attempt < 3 AND (
      status = 'queued' OR (status = 'processing' AND lease_expires_at < now())
    ) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.recommendation_audit_export_jobs job
    SET status = 'processing', attempt = attempt + 1,
        lease_owner = gen_random_uuid()::text, lease_expires_at = now() + interval '2 minutes',
        started_at = coalesce(started_at, now()), failure_code = NULL, resolved_at = NULL
    FROM candidates WHERE job.id = candidates.id RETURNING job.*
  ) SELECT * FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_recommendation_audit_export(
  p_id uuid, p_lease_owner text, p_payload jsonb, p_payload_hash text
) RETURNS public.recommendation_audit_export_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.recommendation_audit_export_jobs;
BEGIN
  IF jsonb_typeof(p_payload) <> 'object'
     OR p_payload ->> 'schemaVersion' <> 'deliveryiq.recommendation-audit-export/1.0.0'
     OR p_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_INVALID';
  END IF;
  SELECT * INTO v_job FROM public.recommendation_audit_export_jobs
  WHERE id = p_id AND status = 'processing' AND lease_owner = p_lease_owner FOR UPDATE;
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'RECOMMENDATION_EXPORT_LEASE_INVALID'; END IF;
  IF p_payload #>> '{scope,organisationId}' <> v_job.organisation_id::text
     OR p_payload #>> '{scope,workspaceId}' <> v_job.workspace_id::text
     OR p_payload #>> '{scope,portfolioId}' <> v_job.portfolio_id::text
     OR p_payload #>> '{integrity,status}' <> 'passed' THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_INTEGRITY_FAILED';
  END IF;
  PERFORM set_config('app.recommendation_export_transition', 'on', true);
  UPDATE public.recommendation_audit_export_jobs SET
    status = 'completed', retryable = false, lease_owner = NULL, lease_expires_at = NULL,
    export_payload = p_payload, payload_hash = p_payload_hash, completed_at = now(),
    available_until = now() + interval '15 minutes', resolved_at = now()
  WHERE id = p_id RETURNING * INTO v_job;
  INSERT INTO public.recommendation_integrity_results (
    organisation_id, workspace_id, portfolio_id, export_job_id, status,
    checks, payload_hash, checker_version
  ) VALUES (
    v_job.organisation_id, v_job.workspace_id, v_job.portfolio_id, v_job.id, 'passed',
    p_payload #> '{integrity,checks}', p_payload_hash,
    'deliveryiq.recommendation-integrity/1.0.0'
  );
  INSERT INTO public.recommendation_operational_events (
    organisation_id, workspace_id, event_type, severity, object_type, object_id,
    object_version, categorical_metadata
  ) VALUES
    (v_job.organisation_id, v_job.workspace_id, 'integrity_passed', 'info',
      'portfolio', v_job.portfolio_id::text, '1', '{}'::jsonb),
    (v_job.organisation_id, v_job.workspace_id, 'audit_export_completed', 'info',
      'audit_export', v_job.id::text, v_job.attempt::text,
      jsonb_build_object('projection',v_job.projection));
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_recommendation_audit_export(
  p_id uuid, p_lease_owner text, p_failure_code text
) RETURNS public.recommendation_audit_export_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.recommendation_audit_export_jobs;
BEGIN
  IF length(p_failure_code) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'RECOMMENDATION_AUDIT_EXPORT_INVALID';
  END IF;
  PERFORM set_config('app.recommendation_export_transition', 'on', true);
  UPDATE public.recommendation_audit_export_jobs SET
    status = 'failed',
    retryable = attempt < 3 AND p_failure_code <> 'RECOMMENDATION_AUDIT_INTEGRITY_FAILED',
    lease_owner = NULL, lease_expires_at = NULL,
    failure_code = p_failure_code, resolved_at = now()
  WHERE id = p_id AND status = 'processing' AND lease_owner = p_lease_owner
  RETURNING * INTO v_job;
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'RECOMMENDATION_EXPORT_LEASE_INVALID'; END IF;
  IF p_failure_code = 'RECOMMENDATION_AUDIT_INTEGRITY_FAILED' THEN
    INSERT INTO public.recommendation_integrity_results (
      organisation_id, workspace_id, portfolio_id, export_job_id, status,
      checks, payload_hash, checker_version
    ) VALUES (
      v_job.organisation_id, v_job.workspace_id, v_job.portfolio_id, v_job.id, 'failed',
      jsonb_build_object('lineage', false), v_job.request_hash,
      'deliveryiq.recommendation-integrity/1.0.0'
    );
    INSERT INTO public.recommendation_operational_events (
      organisation_id, workspace_id, event_type, severity, alert_code,
      object_type, object_id, object_version, categorical_metadata
    ) VALUES (
      v_job.organisation_id, v_job.workspace_id, 'integrity_failed', 'critical',
      'orphan_lineage', 'portfolio', v_job.portfolio_id::text, '1',
      jsonb_build_object('failureCode', p_failure_code)
    );
  END IF;
  INSERT INTO public.recommendation_operational_events (
    organisation_id, workspace_id, event_type, severity, alert_code,
    object_type, object_id, object_version, categorical_metadata
  ) VALUES (
    v_job.organisation_id, v_job.workspace_id, 'audit_export_failed',
    CASE WHEN v_job.retryable THEN 'warning' ELSE 'critical' END,
    'export_failure', 'audit_export', v_job.id::text, v_job.attempt::text,
    jsonb_build_object('failureCode', p_failure_code, 'retryable', v_job.retryable)
  );
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_recommendation_audit_export(
  p_id uuid, p_organisation_id uuid, p_workspace_id uuid
) RETURNS public.recommendation_audit_export_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.recommendation_audit_export_jobs;
BEGIN
  PERFORM set_config('app.recommendation_export_transition', 'on', true);
  UPDATE public.recommendation_audit_export_jobs SET
    status = 'queued', retryable = true, failure_code = NULL, resolved_at = NULL,
    lease_owner = NULL, lease_expires_at = NULL
  WHERE id = p_id AND organisation_id = p_organisation_id AND workspace_id = p_workspace_id
    AND status = 'failed' AND retryable = true AND attempt < 3
  RETURNING * INTO v_job;
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'RECOMMENDATION_EXPORT_RETRY_INVALID'; END IF;
  INSERT INTO public.recommendation_operational_events (
    organisation_id, workspace_id, event_type, severity, object_type, object_id,
    object_version, categorical_metadata
  ) VALUES (
    v_job.organisation_id, v_job.workspace_id, 'audit_export_retried', 'info',
    'audit_export', v_job.id::text, v_job.attempt::text, '{}'::jsonb
  );
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_recommendation_export_access(
  p_id uuid, p_organisation_id uuid, p_workspace_id uuid, p_actor_user_id uuid, p_mode text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.recommendation_audit_export_jobs;
BEGIN
  IF p_mode NOT IN ('status','download') THEN RAISE EXCEPTION 'RECOMMENDATION_EXPORT_ACCESS_INVALID'; END IF;
  SELECT * INTO v_job FROM public.recommendation_audit_export_jobs
  WHERE id = p_id AND organisation_id = p_organisation_id AND workspace_id = p_workspace_id;
  IF v_job.id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships
    WHERE organisation_id = p_organisation_id AND user_id = p_actor_user_id
      AND status = 'active' AND is_deleted = false
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  INSERT INTO public.recommendation_operational_events (
    organisation_id, workspace_id, actor_user_id, event_type, severity,
    object_type, object_id, object_version, categorical_metadata
  ) VALUES (
    p_organisation_id, p_workspace_id, p_actor_user_id, 'audit_export_accessed', 'info',
    'audit_export', p_id::text, v_job.attempt::text, jsonb_build_object('mode',p_mode)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recommendation_operational_health()
RETURNS TABLE (
  generated_at timestamptz, status text, queued_exports bigint, processing_exports bigint,
  failed_exports bigint, oldest_queued_seconds bigint, critical_integrity_failures bigint,
  open_critical_alerts bigint, alert_coverage text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH metrics AS (
    SELECT
      count(*) FILTER (WHERE status = 'queued') AS queued,
      count(*) FILTER (WHERE status = 'processing') AS processing,
      count(*) FILTER (WHERE status = 'failed') AS failed,
      coalesce(extract(epoch FROM now() - min(created_at) FILTER (WHERE status = 'queued'))::bigint, 0) AS oldest
    FROM public.recommendation_audit_export_jobs
  ), integrity AS (
    SELECT count(*) FILTER (WHERE status = 'failed') AS failures
    FROM public.recommendation_integrity_results
  ), alerts AS (
    SELECT count(*) FILTER (WHERE severity = 'critical' AND occurred_at >= now() - interval '24 hours') AS critical
    FROM public.recommendation_operational_events
  )
  SELECT now(),
    CASE WHEN integrity.failures > 0 OR alerts.critical > 0 THEN 'unhealthy'
         WHEN metrics.failed > 0 OR metrics.oldest > 60 THEN 'degraded'
         ELSE 'healthy' END,
    metrics.queued, metrics.processing, metrics.failed, metrics.oldest,
    integrity.failures, alerts.critical,
    ARRAY['promotion_failure','invalid_catalogue','orphan_lineage','dependency_cycle',
      'transition_conflict','command_failure','export_failure','tenant_denial',
      'handoff_abuse','latency']::text[]
  FROM metrics, integrity, alerts;
$$;

ALTER TABLE public.recommendation_feature_flag_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_audit_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_integrity_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_operational_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.recommendation_operational_events_id_seq
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_audit_export_transition(),
  public.resolve_recommendation_feature_flag(text),
  public.set_recommendation_feature_flag(jsonb),
  public.request_recommendation_audit_export(jsonb),
  public.claim_recommendation_audit_exports(integer),
  public.complete_recommendation_audit_export(uuid,text,jsonb,text),
  public.fail_recommendation_audit_export(uuid,text,text),
  public.retry_recommendation_audit_export(uuid,uuid,uuid),
  public.record_recommendation_export_access(uuid,uuid,uuid,uuid,text),
  public.recommendation_operational_health()
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_recommendation_feature_flag(text),
  public.set_recommendation_feature_flag(jsonb),
  public.request_recommendation_audit_export(jsonb),
  public.claim_recommendation_audit_exports(integer),
  public.complete_recommendation_audit_export(uuid,text,jsonb,text),
  public.fail_recommendation_audit_export(uuid,text,text),
  public.retry_recommendation_audit_export(uuid,uuid,uuid),
  public.record_recommendation_export_access(uuid,uuid,uuid,uuid,text),
  public.recommendation_operational_health()
  TO service_role;

COMMENT ON TABLE public.recommendation_audit_export_jobs IS
  'S4-014 bounded, tenant-scoped, expiring recommendation audit export queue.';
COMMENT ON TABLE public.recommendation_operational_events IS
  'S4-014 structured operational signals; categorical metadata only.';
