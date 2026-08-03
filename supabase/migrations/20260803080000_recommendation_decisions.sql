CREATE TYPE public.recommendation_decision_state AS ENUM (
  'undecided', 'accepted', 'deferred', 'rejected', 'superseded'
);
CREATE TYPE public.recommendation_decision_command AS ENUM (
  'accepted', 'deferred', 'rejected', 'restored', 'superseded'
);
CREATE TYPE public.recommendation_decision_reason_category AS ENUM (
  'not_relevant', 'already_addressed', 'not_feasible', 'wrong_timing',
  'insufficient_evidence', 'other'
);
CREATE TYPE public.recommendation_decision_actor_type AS ENUM ('user', 'system');

CREATE TABLE public.recommendation_decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  decision_version integer NOT NULL CHECK (decision_version > 0),
  command public.recommendation_decision_command NOT NULL,
  previous_state public.recommendation_decision_state NOT NULL,
  current_state public.recommendation_decision_state NOT NULL,
  reason_category public.recommendation_decision_reason_category,
  review_at timestamptz,
  acknowledged boolean NOT NULL DEFAULT false,
  actor_type public.recommendation_decision_actor_type NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  portfolio_policy_version text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_item_id, decision_version),
  UNIQUE (organisation_id, workspace_id, idempotency_key),
  CONSTRAINT recommendation_decision_event_actor CHECK (
    (actor_type = 'user' AND actor_user_id IS NOT NULL)
    OR (actor_type = 'system' AND actor_user_id IS NULL)
  ),
  CONSTRAINT recommendation_decision_event_fields CHECK (
    (command = 'accepted' AND current_state = 'accepted' AND acknowledged
      AND reason_category IS NULL AND review_at IS NULL)
    OR (command = 'deferred' AND current_state = 'deferred' AND NOT acknowledged
      AND review_at IS NOT NULL)
    OR (command = 'rejected' AND current_state = 'rejected' AND NOT acknowledged
      AND reason_category IS NOT NULL AND review_at IS NULL)
    OR (command = 'restored' AND current_state = 'undecided' AND NOT acknowledged
      AND reason_category IS NULL AND review_at IS NULL)
    OR (command = 'superseded' AND current_state = 'superseded' AND NOT acknowledged
      AND reason_category IS NULL AND review_at IS NULL)
  ),
  CONSTRAINT recommendation_decision_event_transition CHECK (
    (command = 'accepted' AND previous_state IN ('undecided', 'deferred', 'rejected'))
    OR (command = 'deferred' AND previous_state IN ('undecided', 'accepted', 'rejected'))
    OR (command = 'rejected' AND previous_state IN ('undecided', 'accepted', 'deferred'))
    OR (command = 'restored' AND previous_state IN ('deferred', 'rejected'))
    OR (command = 'superseded' AND previous_state <> 'superseded')
  )
);

CREATE TABLE public.recommendation_item_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL UNIQUE REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  current_state public.recommendation_decision_state NOT NULL,
  decision_version integer NOT NULL CHECK (decision_version > 0),
  reason_category public.recommendation_decision_reason_category,
  review_at timestamptz,
  acknowledged boolean NOT NULL DEFAULT false,
  last_actor_type public.recommendation_decision_actor_type NOT NULL,
  last_actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  latest_event_id uuid NOT NULL UNIQUE REFERENCES public.recommendation_decision_events(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL,
  CONSTRAINT recommendation_item_decision_actor CHECK (
    (last_actor_type = 'user' AND last_actor_user_id IS NOT NULL)
    OR (last_actor_type = 'system' AND last_actor_user_id IS NULL)
  ),
  CONSTRAINT recommendation_item_decision_fields CHECK (
    (current_state = 'accepted' AND acknowledged AND reason_category IS NULL AND review_at IS NULL)
    OR (current_state = 'deferred' AND NOT acknowledged AND review_at IS NOT NULL)
    OR (current_state = 'rejected' AND NOT acknowledged AND reason_category IS NOT NULL
      AND review_at IS NULL)
    OR (current_state IN ('undecided', 'superseded') AND NOT acknowledged
      AND reason_category IS NULL AND review_at IS NULL)
  )
);

CREATE INDEX recommendation_decision_events_tenant_item_idx
  ON public.recommendation_decision_events (
    organisation_id, workspace_id, portfolio_item_id, decision_version
  );
CREATE INDEX recommendation_decision_events_actor_time_idx
  ON public.recommendation_decision_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;
CREATE INDEX recommendation_item_decisions_tenant_portfolio_idx
  ON public.recommendation_item_decisions (
    organisation_id, workspace_id, portfolio_id, current_state
  );

CREATE TRIGGER recommendation_decision_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_decision_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_decision_event_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item public.recommendation_portfolio_items;
  v_portfolio public.recommendation_portfolios;
BEGIN
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
    WHERE id = NEW.portfolio_item_id;
  SELECT * INTO v_portfolio FROM public.recommendation_portfolios
    WHERE id = NEW.portfolio_id;
  IF v_item.id IS NULL OR v_portfolio.id IS NULL
     OR v_item.portfolio_id <> NEW.portfolio_id
     OR v_item.analysis_run_id <> NEW.analysis_run_id
     OR v_item.organisation_id <> NEW.organisation_id
     OR v_item.workspace_id <> NEW.workspace_id
     OR v_portfolio.analysis_run_id <> NEW.analysis_run_id
     OR v_portfolio.organisation_id <> NEW.organisation_id
     OR v_portfolio.workspace_id <> NEW.workspace_id
     OR v_portfolio.policy_version <> NEW.portfolio_policy_version
     OR v_portfolio.catalogue_version_id <> NEW.catalogue_version_id
     OR v_portfolio.catalogue_digest <> NEW.catalogue_digest THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_decision_event_scope
BEFORE INSERT ON public.recommendation_decision_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_decision_event_scope();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_decision_projection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_event public.recommendation_decision_events;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AUDIT_RECORD_IMMUTABLE';
  END IF;
  SELECT * INTO v_event FROM public.recommendation_decision_events
    WHERE id = NEW.latest_event_id;
  IF v_event.id IS NULL
     OR v_event.portfolio_id <> NEW.portfolio_id
     OR v_event.portfolio_item_id <> NEW.portfolio_item_id
     OR v_event.analysis_run_id <> NEW.analysis_run_id
     OR v_event.organisation_id <> NEW.organisation_id
     OR v_event.workspace_id <> NEW.workspace_id
     OR v_event.decision_version <> NEW.decision_version
     OR v_event.current_state <> NEW.current_state
     OR v_event.reason_category IS DISTINCT FROM NEW.reason_category
     OR v_event.review_at IS DISTINCT FROM NEW.review_at
     OR v_event.acknowledged <> NEW.acknowledged
     OR v_event.actor_type <> NEW.last_actor_type
     OR v_event.actor_user_id IS DISTINCT FROM NEW.last_actor_user_id
     OR v_event.occurred_at <> NEW.updated_at THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id
    OR NEW.portfolio_id <> OLD.portfolio_id
    OR NEW.portfolio_item_id <> OLD.portfolio_item_id
    OR NEW.analysis_run_id <> OLD.analysis_run_id
    OR NEW.recommendation_id <> OLD.recommendation_id
    OR NEW.recommendation_version <> OLD.recommendation_version
    OR NEW.organisation_id <> OLD.organisation_id
    OR NEW.workspace_id <> OLD.workspace_id
    OR NEW.decision_version <> OLD.decision_version + 1
    OR v_event.previous_state <> OLD.current_state
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_item_decisions_governed
BEFORE INSERT OR UPDATE OR DELETE ON public.recommendation_item_decisions
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_decision_projection();

CREATE OR REPLACE FUNCTION public.record_recommendation_item_decision(p_input jsonb)
RETURNS public.recommendation_item_decisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item public.recommendation_portfolio_items;
  v_portfolio public.recommendation_portfolios;
  v_current public.recommendation_item_decisions;
  v_existing public.recommendation_decision_events;
  v_event public.recommendation_decision_events;
  v_command public.recommendation_decision_command;
  v_previous public.recommendation_decision_state;
  v_next public.recommendation_decision_state;
  v_actor_type public.recommendation_decision_actor_type;
  v_actor_user_id uuid;
  v_reason public.recommendation_decision_reason_category;
  v_review_at timestamptz;
  v_acknowledged boolean;
  v_expected_version integer;
BEGIN
  IF p_input IS NULL
     OR length(coalesce(p_input ->> 'idempotency_key', '')) NOT BETWEEN 16 AND 160
     OR p_input ->> 'payload_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'portfolio_item_id' IS NULL
     OR p_input ->> 'organisation_id' IS NULL
     OR p_input ->> 'workspace_id' IS NULL
     OR p_input ->> 'command' IS NULL
     OR p_input ->> 'expected_version' !~ '^\d+$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
  END IF;

  v_command := (p_input ->> 'command')::public.recommendation_decision_command;
  v_expected_version := (p_input ->> 'expected_version')::integer;
  v_actor_user_id := NULLIF(p_input ->> 'actor_user_id', '')::uuid;
  v_actor_type := CASE WHEN v_actor_user_id IS NULL THEN 'system' ELSE 'user' END;
  v_acknowledged := coalesce((p_input ->> 'acknowledged')::boolean, false);
  v_reason := NULLIF(p_input ->> 'reason_category', '')::public.recommendation_decision_reason_category;
  v_review_at := NULLIF(p_input ->> 'review_at', '')::timestamptz;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'portfolio_item_id', 0));
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
    WHERE id = (p_input ->> 'portfolio_item_id')::uuid FOR SHARE;
  SELECT * INTO v_portfolio FROM public.recommendation_portfolios
    WHERE id = v_item.portfolio_id FOR SHARE;
  IF v_item.id IS NULL OR v_portfolio.id IS NULL
     OR v_item.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_item.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_portfolio.organisation_id <> v_item.organisation_id
     OR v_portfolio.workspace_id <> v_item.workspace_id
     OR v_item.analysis_run_id <> v_portfolio.analysis_run_id THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;

  IF v_actor_type = 'user' AND (
    v_command = 'superseded' OR NOT EXISTS (
      SELECT 1 FROM public.organisation_memberships membership
      JOIN public.workspaces workspace ON workspace.id = v_item.workspace_id
      WHERE membership.user_id = v_actor_user_id
        AND membership.organisation_id = v_item.organisation_id
        AND membership.status = 'active' AND membership.is_deleted = false
        AND workspace.organisation_id = v_item.organisation_id
        AND workspace.is_deleted = false
    )
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;
  IF v_actor_type = 'system' AND v_command <> 'superseded' THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;

  SELECT * INTO v_existing FROM public.recommendation_decision_events
    WHERE organisation_id = v_item.organisation_id
      AND workspace_id = v_item.workspace_id
      AND idempotency_key = p_input ->> 'idempotency_key';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.portfolio_item_id <> v_item.id
       OR v_existing.payload_hash <> p_input ->> 'payload_hash' THEN
      RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
    END IF;
    SELECT * INTO v_current FROM public.recommendation_item_decisions
      WHERE portfolio_item_id = v_item.id;
    RETURN v_current;
  END IF;

  SELECT * INTO v_current FROM public.recommendation_item_decisions
    WHERE portfolio_item_id = v_item.id FOR UPDATE;
  v_previous := coalesce(v_current.current_state, 'undecided');
  IF coalesce(v_current.decision_version, 0) <> v_expected_version THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_VERSION_CONFLICT';
  END IF;

  v_next := CASE v_command
    WHEN 'accepted' THEN 'accepted'
    WHEN 'deferred' THEN 'deferred'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'restored' THEN 'undecided'
    WHEN 'superseded' THEN 'superseded'
  END;
  IF NOT (
    (v_command = 'accepted' AND v_previous IN ('undecided', 'deferred', 'rejected'))
    OR (v_command = 'deferred' AND v_previous IN ('undecided', 'accepted', 'rejected'))
    OR (v_command = 'rejected' AND v_previous IN ('undecided', 'accepted', 'deferred'))
    OR (v_command = 'restored' AND v_previous IN ('deferred', 'rejected'))
    OR (v_command = 'superseded' AND v_previous <> 'superseded')
  ) OR NOT (
    (v_command = 'accepted' AND v_acknowledged AND v_reason IS NULL AND v_review_at IS NULL)
    OR (v_command = 'deferred' AND NOT v_acknowledged AND v_review_at IS NOT NULL)
    OR (v_command = 'rejected' AND NOT v_acknowledged AND v_reason IS NOT NULL AND v_review_at IS NULL)
    OR (v_command IN ('restored', 'superseded') AND NOT v_acknowledged
      AND v_reason IS NULL AND v_review_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_DECISION_INVALID';
  END IF;

  INSERT INTO public.recommendation_decision_events (
    portfolio_id, portfolio_item_id, analysis_run_id, organisation_id, workspace_id,
    decision_version, command, previous_state, current_state, reason_category,
    review_at, acknowledged, actor_type, actor_user_id, portfolio_policy_version,
    catalogue_version_id, catalogue_digest, idempotency_key, payload_hash
  ) VALUES (
    v_item.portfolio_id, v_item.id, v_item.analysis_run_id,
    v_item.organisation_id, v_item.workspace_id, v_expected_version + 1,
    v_command, v_previous, v_next, v_reason, v_review_at, v_acknowledged,
    v_actor_type, v_actor_user_id, v_portfolio.policy_version,
    v_portfolio.catalogue_version_id, v_portfolio.catalogue_digest,
    p_input ->> 'idempotency_key', p_input ->> 'payload_hash'
  ) RETURNING * INTO v_event;

  INSERT INTO public.recommendation_item_decisions (
    portfolio_id, portfolio_item_id, analysis_run_id, recommendation_id,
    recommendation_version, organisation_id, workspace_id, current_state,
    decision_version, reason_category, review_at, acknowledged, last_actor_type,
    last_actor_user_id, latest_event_id, updated_at
  ) VALUES (
    v_item.portfolio_id, v_item.id, v_item.analysis_run_id, v_item.recommendation_id,
    v_item.recommendation_version, v_item.organisation_id, v_item.workspace_id,
    v_next, v_event.decision_version, v_reason, v_review_at, v_acknowledged,
    v_actor_type, v_actor_user_id, v_event.id, v_event.occurred_at
  ) ON CONFLICT (portfolio_item_id) DO UPDATE SET
    current_state = EXCLUDED.current_state,
    decision_version = EXCLUDED.decision_version,
    reason_category = EXCLUDED.reason_category,
    review_at = EXCLUDED.review_at,
    acknowledged = EXCLUDED.acknowledged,
    last_actor_type = EXCLUDED.last_actor_type,
    last_actor_user_id = EXCLUDED.last_actor_user_id,
    latest_event_id = EXCLUDED.latest_event_id,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_current;
  RETURN v_current;
END;
$$;

ALTER TABLE public.recommendation_decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_item_decisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_decision_events,
  public.recommendation_item_decisions FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_decision_event_scope()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_decision_projection()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_recommendation_item_decision(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_decision_events,
  public.recommendation_item_decisions TO service_role;
GRANT INSERT ON public.recommendation_decision_events,
  public.recommendation_item_decisions TO service_role;
GRANT UPDATE ON public.recommendation_item_decisions TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_item_decision(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_decision_events IS
  'Append-only S4-008 customer decision transition history.';
COMMENT ON TABLE public.recommendation_item_decisions IS
  'Governed current projection over immutable S4-008 decision events.';
