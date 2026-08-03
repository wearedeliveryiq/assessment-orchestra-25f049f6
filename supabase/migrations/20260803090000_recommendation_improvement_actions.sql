CREATE TYPE public.recommendation_action_status AS ENUM (
  'not_started', 'in_progress', 'blocked', 'completed', 'cancelled'
);
CREATE TYPE public.recommendation_action_command AS ENUM (
  'created', 'updated', 'started', 'blocked', 'completed', 'cancelled'
);

CREATE TABLE public.recommendation_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  plan_version integer NOT NULL CHECK (plan_version > 0),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, plan_version)
);

CREATE TABLE public.recommendation_improvement_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.recommendation_improvement_plans(id) ON DELETE RESTRICT,
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  action_version integer NOT NULL CHECK (action_version > 0),
  command public.recommendation_action_command NOT NULL,
  previous_state public.recommendation_action_status,
  current_state public.recommendation_action_status NOT NULL,
  accountable_owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  contributor_ids uuid[] NOT NULL DEFAULT '{}',
  target_date date,
  note text CHECK (note IS NULL OR length(note) BETWEEN 1 AND 2000),
  completion_note text CHECK (
    completion_note IS NULL OR length(completion_note) BETWEEN 1 AND 2000
  ),
  evidence_references text[] NOT NULL DEFAULT '{}',
  evidence_not_available_reason text CHECK (
    evidence_not_available_reason IS NULL
    OR length(evidence_not_available_reason) BETWEEN 1 AND 1000
  ),
  dependency_override boolean NOT NULL DEFAULT false,
  blocking_dependency_ids text[] NOT NULL DEFAULT '{}',
  dependency_override_reason text CHECK (
    dependency_override_reason IS NULL
    OR length(dependency_override_reason) BETWEEN 1 AND 1000
  ),
  dependency_override_acknowledged boolean NOT NULL DEFAULT false,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action_id, action_version),
  UNIQUE (organisation_id, workspace_id, idempotency_key),
  CONSTRAINT recommendation_action_event_created_state CHECK (
    (command = 'created' AND previous_state IS NULL AND current_state = 'not_started')
    OR (command <> 'created' AND previous_state IS NOT NULL)
  ),
  CONSTRAINT recommendation_action_event_transition CHECK (
    (command = 'created' AND previous_state IS NULL AND current_state = 'not_started')
    OR (command = 'updated' AND current_state = previous_state)
    OR (command = 'started' AND previous_state IN ('not_started', 'blocked')
      AND current_state = 'in_progress')
    OR (command = 'blocked' AND previous_state IN ('not_started', 'in_progress')
      AND current_state = 'blocked')
    OR (command = 'completed' AND previous_state = 'in_progress'
      AND current_state = 'completed')
    OR (command = 'cancelled' AND previous_state IS NOT NULL
      AND previous_state NOT IN ('completed', 'cancelled') AND current_state = 'cancelled')
  ),
  CONSTRAINT recommendation_action_event_completion CHECK (
    (current_state = 'completed' AND completion_note IS NOT NULL
      AND ((cardinality(evidence_references) > 0 AND evidence_not_available_reason IS NULL)
        OR (cardinality(evidence_references) = 0 AND evidence_not_available_reason IS NOT NULL)))
    OR (current_state <> 'completed' AND completion_note IS NULL
      AND cardinality(evidence_references) = 0 AND evidence_not_available_reason IS NULL)
  ),
  CONSTRAINT recommendation_action_event_override CHECK (
    (dependency_override AND command = 'started'
      AND dependency_override_acknowledged AND dependency_override_reason IS NOT NULL
      AND cardinality(blocking_dependency_ids) > 0)
    OR (NOT dependency_override AND NOT dependency_override_acknowledged
      AND dependency_override_reason IS NULL AND cardinality(blocking_dependency_ids) = 0)
  )
);

CREATE TABLE public.recommendation_improvement_actions (
  id uuid PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.recommendation_improvement_plans(id) ON DELETE RESTRICT,
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  source_decision_id uuid NOT NULL REFERENCES public.recommendation_item_decisions(id) ON DELETE RESTRICT,
  source_decision_version integer NOT NULL CHECK (source_decision_version > 0),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  status public.recommendation_action_status NOT NULL,
  action_version integer NOT NULL CHECK (action_version > 0),
  accountable_owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  contributor_ids uuid[] NOT NULL DEFAULT '{}',
  target_date date,
  note text CHECK (note IS NULL OR length(note) BETWEEN 1 AND 2000),
  completion_note text CHECK (
    completion_note IS NULL OR length(completion_note) BETWEEN 1 AND 2000
  ),
  evidence_references text[] NOT NULL DEFAULT '{}',
  evidence_not_available_reason text CHECK (
    evidence_not_available_reason IS NULL
    OR length(evidence_not_available_reason) BETWEEN 1 AND 1000
  ),
  latest_event_id uuid NOT NULL UNIQUE REFERENCES public.recommendation_improvement_action_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (plan_id, portfolio_item_id),
  CONSTRAINT recommendation_action_terminal_time CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND completed_at IS NULL)
    OR (status NOT IN ('completed', 'cancelled') AND completed_at IS NULL AND cancelled_at IS NULL)
  ),
  CONSTRAINT recommendation_action_progress_fields CHECK (
    (status = 'in_progress' AND accountable_owner_id IS NOT NULL AND target_date IS NOT NULL)
    OR status <> 'in_progress'
  ),
  CONSTRAINT recommendation_action_completion CHECK (
    (status = 'completed' AND completion_note IS NOT NULL
      AND ((cardinality(evidence_references) > 0 AND evidence_not_available_reason IS NULL)
        OR (cardinality(evidence_references) = 0 AND evidence_not_available_reason IS NOT NULL)))
    OR (status <> 'completed' AND completion_note IS NULL
      AND cardinality(evidence_references) = 0 AND evidence_not_available_reason IS NULL)
  )
);

ALTER TABLE public.recommendation_improvement_action_events
  ADD CONSTRAINT recommendation_improvement_action_events_action_id_fkey
  FOREIGN KEY (action_id) REFERENCES public.recommendation_improvement_actions(id)
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX recommendation_improvement_plans_tenant_idx
  ON public.recommendation_improvement_plans (organisation_id, workspace_id, portfolio_id);
CREATE INDEX recommendation_improvement_actions_tenant_status_idx
  ON public.recommendation_improvement_actions (
    organisation_id, workspace_id, portfolio_id, status
  );
CREATE INDEX recommendation_improvement_actions_owner_idx
  ON public.recommendation_improvement_actions (accountable_owner_id, status)
  WHERE accountable_owner_id IS NOT NULL;
CREATE INDEX recommendation_improvement_action_events_tenant_idx
  ON public.recommendation_improvement_action_events (
    organisation_id, workspace_id, action_id, action_version
  );

CREATE TRIGGER recommendation_improvement_plans_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_improvement_plans
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TRIGGER recommendation_improvement_action_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_improvement_action_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_action_event_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_plan public.recommendation_improvement_plans;
  v_item public.recommendation_portfolio_items;
BEGIN
  SELECT * INTO v_plan FROM public.recommendation_improvement_plans WHERE id = NEW.plan_id;
  SELECT * INTO v_item FROM public.recommendation_portfolio_items WHERE id = NEW.portfolio_item_id;
  IF v_plan.id IS NULL OR v_item.id IS NULL
     OR v_plan.portfolio_id <> NEW.portfolio_id
     OR v_plan.analysis_run_id <> NEW.analysis_run_id
     OR v_plan.organisation_id <> NEW.organisation_id
     OR v_plan.workspace_id <> NEW.workspace_id
     OR v_item.portfolio_id <> NEW.portfolio_id
     OR v_item.analysis_run_id <> NEW.analysis_run_id
     OR v_item.organisation_id <> NEW.organisation_id
     OR v_item.workspace_id <> NEW.workspace_id
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspace_memberships workspace_membership
         ON workspace_membership.user_id = membership.user_id
        AND workspace_membership.workspace_id = NEW.workspace_id
       WHERE membership.user_id = NEW.actor_user_id
         AND membership.organisation_id = NEW.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace_membership.status = 'active'
         AND workspace_membership.is_deleted = false
     )
     OR EXISTS (
       SELECT 1 FROM unnest(array_append(NEW.contributor_ids, NEW.accountable_owner_id))
         assigned(user_id)
       WHERE assigned.user_id IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.organisation_memberships membership
         JOIN public.workspace_memberships workspace_membership
           ON workspace_membership.user_id = membership.user_id
          AND workspace_membership.workspace_id = NEW.workspace_id
         WHERE membership.user_id = assigned.user_id
           AND membership.organisation_id = NEW.organisation_id
           AND membership.status = 'active' AND membership.is_deleted = false
           AND workspace_membership.status = 'active'
           AND workspace_membership.is_deleted = false
       )
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_improvement_action_event_scope
BEFORE INSERT ON public.recommendation_improvement_action_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_action_event_scope();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_action_projection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_event public.recommendation_improvement_action_events;
  v_item public.recommendation_portfolio_items;
  v_decision public.recommendation_item_decisions;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AUDIT_RECORD_IMMUTABLE'; END IF;
  SELECT * INTO v_event FROM public.recommendation_improvement_action_events
    WHERE id = NEW.latest_event_id;
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
    WHERE id = NEW.portfolio_item_id;
  SELECT * INTO v_decision FROM public.recommendation_item_decisions
    WHERE id = NEW.source_decision_id;
  IF v_event.id IS NULL OR v_item.id IS NULL OR v_decision.id IS NULL
     OR v_event.action_id <> NEW.id
     OR v_event.plan_id <> NEW.plan_id
     OR v_event.portfolio_id <> NEW.portfolio_id
     OR v_event.portfolio_item_id <> NEW.portfolio_item_id
     OR v_event.analysis_run_id <> NEW.analysis_run_id
     OR v_event.organisation_id <> NEW.organisation_id
     OR v_event.workspace_id <> NEW.workspace_id
     OR v_event.action_version <> NEW.action_version
     OR v_event.current_state <> NEW.status
     OR v_event.accountable_owner_id IS DISTINCT FROM NEW.accountable_owner_id
     OR v_event.contributor_ids <> NEW.contributor_ids
     OR v_event.target_date IS DISTINCT FROM NEW.target_date
     OR v_event.note IS DISTINCT FROM NEW.note
     OR v_event.completion_note IS DISTINCT FROM NEW.completion_note
     OR v_event.evidence_references <> NEW.evidence_references
     OR v_event.evidence_not_available_reason IS DISTINCT FROM NEW.evidence_not_available_reason
     OR v_event.occurred_at <> NEW.updated_at
     OR v_item.recommendation_id <> NEW.recommendation_id
     OR v_item.recommendation_version <> NEW.recommendation_version
     OR v_decision.portfolio_item_id <> NEW.portfolio_item_id
     OR v_decision.decision_version <> NEW.source_decision_version THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  IF TG_OP = 'INSERT' AND (
    NEW.action_version <> 1 OR v_event.command <> 'created' OR v_event.previous_state IS NOT NULL
    OR NEW.created_at <> NEW.updated_at OR NEW.started_at IS NOT NULL
    OR NEW.completed_at IS NOT NULL OR NEW.cancelled_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.plan_id <> OLD.plan_id OR NEW.portfolio_id <> OLD.portfolio_id
    OR NEW.portfolio_item_id <> OLD.portfolio_item_id
    OR NEW.analysis_run_id <> OLD.analysis_run_id
    OR NEW.recommendation_id <> OLD.recommendation_id
    OR NEW.recommendation_version <> OLD.recommendation_version
    OR NEW.source_decision_id <> OLD.source_decision_id
    OR NEW.source_decision_version <> OLD.source_decision_version
    OR NEW.organisation_id <> OLD.organisation_id OR NEW.workspace_id <> OLD.workspace_id
    OR NEW.created_at <> OLD.created_at OR NEW.action_version <> OLD.action_version + 1
    OR v_event.previous_state <> OLD.status
    OR NEW.started_at IS DISTINCT FROM CASE
      WHEN v_event.command = 'started' THEN coalesce(OLD.started_at, v_event.occurred_at)
      ELSE OLD.started_at
    END
    OR NEW.completed_at IS DISTINCT FROM CASE
      WHEN v_event.current_state = 'completed' THEN v_event.occurred_at ELSE NULL
    END
    OR NEW.cancelled_at IS DISTINCT FROM CASE
      WHEN v_event.current_state = 'cancelled' THEN v_event.occurred_at ELSE NULL
    END
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_improvement_actions_governed
BEFORE INSERT OR UPDATE OR DELETE ON public.recommendation_improvement_actions
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_action_projection();

CREATE OR REPLACE FUNCTION public.record_recommendation_improvement_action(p_input jsonb)
RETURNS public.recommendation_improvement_actions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item public.recommendation_portfolio_items;
  v_portfolio public.recommendation_portfolios;
  v_decision public.recommendation_item_decisions;
  v_plan public.recommendation_improvement_plans;
  v_current public.recommendation_improvement_actions;
  v_existing public.recommendation_improvement_action_events;
  v_event public.recommendation_improvement_action_events;
  v_action_id uuid;
  v_command public.recommendation_action_command;
  v_previous public.recommendation_action_status;
  v_next public.recommendation_action_status;
  v_actor_user_id uuid;
  v_owner_id uuid;
  v_contributors uuid[];
  v_target_date date;
  v_note text;
  v_completion_note text;
  v_evidence text[];
  v_evidence_unavailable text;
  v_override boolean;
  v_override_reason text;
  v_override_ack boolean;
  v_expected_version integer;
  v_plan_version integer;
  v_blocking_dependencies text[];
  v_now timestamptz := now();
BEGIN
  IF p_input IS NULL
     OR length(coalesce(p_input ->> 'idempotency_key', '')) NOT BETWEEN 16 AND 160
     OR coalesce(p_input ->> 'payload_hash', '') !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'portfolio_item_id' IS NULL
     OR p_input ->> 'organisation_id' IS NULL
     OR p_input ->> 'workspace_id' IS NULL
     OR p_input ->> 'actor_user_id' IS NULL
     OR p_input ->> 'command' IS NULL
     OR coalesce(p_input ->> 'expected_version', '') !~ '^\d+$'
     OR coalesce(p_input ->> 'plan_version', '') !~ '^\d+$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  v_command := (p_input ->> 'command')::public.recommendation_action_command;
  v_expected_version := (p_input ->> 'expected_version')::integer;
  v_plan_version := (p_input ->> 'plan_version')::integer;
  v_actor_user_id := (p_input ->> 'actor_user_id')::uuid;
  v_owner_id := NULLIF(p_input ->> 'accountable_owner_id', '')::uuid;
  v_target_date := NULLIF(p_input ->> 'target_date', '')::date;
  v_note := NULLIF(btrim(p_input ->> 'note'), '');
  v_completion_note := NULLIF(btrim(p_input ->> 'completion_note'), '');
  v_evidence_unavailable := NULLIF(btrim(p_input ->> 'evidence_not_available_reason'), '');
  v_override := coalesce((p_input ->> 'dependency_override')::boolean, false);
  v_override_reason := NULLIF(btrim(p_input ->> 'dependency_override_reason'), '');
  v_override_ack := coalesce((p_input ->> 'dependency_override_acknowledged')::boolean, false);
  SELECT coalesce(array_agg(value::uuid ORDER BY value), '{}') INTO v_contributors
    FROM jsonb_array_elements_text(coalesce(p_input -> 'contributor_ids', '[]'::jsonb)) value;
  SELECT coalesce(array_agg(btrim(value) ORDER BY btrim(value)), '{}') INTO v_evidence
    FROM jsonb_array_elements_text(coalesce(p_input -> 'evidence_references', '[]'::jsonb)) value;

  IF v_plan_version < 1 OR cardinality(v_contributors) > 50 OR cardinality(v_evidence) > 20
     OR cardinality(v_contributors) <> cardinality(ARRAY(SELECT DISTINCT unnest(v_contributors)))
     OR cardinality(v_evidence) <> cardinality(ARRAY(SELECT DISTINCT unnest(v_evidence)))
     OR v_owner_id = ANY(v_contributors)
     OR (v_note IS NOT NULL AND length(v_note) > 2000)
     OR (v_completion_note IS NOT NULL AND length(v_completion_note) > 2000)
     OR EXISTS (SELECT 1 FROM unnest(v_evidence) value WHERE length(value) NOT BETWEEN 1 AND 500)
     OR (v_evidence_unavailable IS NOT NULL AND length(v_evidence_unavailable) > 1000)
     OR (v_override_reason IS NOT NULL AND length(v_override_reason) > 1000) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'portfolio_item_id', 0));
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
    WHERE id = (p_input ->> 'portfolio_item_id')::uuid FOR SHARE;
  SELECT * INTO v_portfolio FROM public.recommendation_portfolios
    WHERE id = v_item.portfolio_id FOR SHARE;
  SELECT * INTO v_decision FROM public.recommendation_item_decisions
    WHERE portfolio_item_id = v_item.id FOR SHARE;
  IF v_item.id IS NULL OR v_portfolio.id IS NULL
     OR v_item.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_item.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_portfolio.organisation_id <> v_item.organisation_id
     OR v_portfolio.workspace_id <> v_item.workspace_id
     OR v_item.analysis_run_id <> v_portfolio.analysis_run_id
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspace_memberships workspace_membership
         ON workspace_membership.user_id = membership.user_id
        AND workspace_membership.workspace_id = v_item.workspace_id
       JOIN public.workspaces workspace ON workspace.id = v_item.workspace_id
       WHERE membership.user_id = v_actor_user_id
         AND membership.organisation_id = v_item.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace_membership.status = 'active' AND workspace_membership.is_deleted = false
         AND workspace.organisation_id = v_item.organisation_id AND workspace.is_deleted = false
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;

  SELECT * INTO v_existing FROM public.recommendation_improvement_action_events
    WHERE organisation_id = v_item.organisation_id
      AND workspace_id = v_item.workspace_id
      AND idempotency_key = p_input ->> 'idempotency_key';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.portfolio_item_id <> v_item.id
       OR v_existing.payload_hash <> p_input ->> 'payload_hash' THEN
      RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
    END IF;
    SELECT * INTO v_current FROM public.recommendation_improvement_actions
      WHERE id = v_existing.action_id;
    RETURN v_current;
  END IF;

  INSERT INTO public.recommendation_improvement_plans (
    portfolio_id, analysis_run_id, organisation_id, workspace_id, plan_version, created_by_user_id
  ) VALUES (
    v_item.portfolio_id, v_item.analysis_run_id, v_item.organisation_id, v_item.workspace_id,
    v_plan_version, v_actor_user_id
  ) ON CONFLICT (portfolio_id, plan_version) DO NOTHING;
  SELECT * INTO v_plan FROM public.recommendation_improvement_plans
    WHERE portfolio_id = v_item.portfolio_id AND plan_version = v_plan_version FOR SHARE;

  IF v_command = 'created' THEN
    SELECT * INTO v_current FROM public.recommendation_improvement_actions
      WHERE plan_id = v_plan.id AND portfolio_item_id = v_item.id;
    IF v_current.id IS NOT NULL THEN RETURN v_current; END IF;
    IF v_decision.id IS NULL OR v_decision.current_state <> 'accepted' THEN
      RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
    END IF;
    v_action_id := gen_random_uuid();
    v_previous := NULL;
    v_next := 'not_started';
  ELSE
    v_action_id := NULLIF(p_input ->> 'action_id', '')::uuid;
    SELECT * INTO v_current FROM public.recommendation_improvement_actions
      WHERE id = v_action_id AND plan_id = v_plan.id AND portfolio_item_id = v_item.id FOR UPDATE;
    IF v_current.id IS NULL THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
    v_previous := v_current.status;
    IF v_current.action_version <> v_expected_version THEN
      RAISE EXCEPTION 'RECOMMENDATION_ACTION_VERSION_CONFLICT';
    END IF;
    IF v_previous IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID'; END IF;
    v_next := CASE v_command
      WHEN 'updated' THEN v_previous
      WHEN 'started' THEN 'in_progress'
      WHEN 'blocked' THEN 'blocked'
      WHEN 'completed' THEN 'completed'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE NULL
    END;
    IF (v_command = 'started' AND v_previous NOT IN ('not_started', 'blocked'))
       OR (v_command = 'blocked' AND v_previous NOT IN ('not_started', 'in_progress'))
       OR (v_command = 'completed' AND v_previous <> 'in_progress')
       OR (v_command = 'cancelled' AND NOT coalesce((p_input ->> 'cancel_acknowledged')::boolean, false))
       OR v_next IS NULL THEN
      RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
    END IF;
  END IF;

  IF coalesce(v_current.action_version, 0) <> v_expected_version THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_VERSION_CONFLICT';
  END IF;
  IF v_command IN ('created', 'started')
     AND (v_decision.id IS NULL OR v_decision.current_state <> 'accepted') THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;
  IF v_command = 'started' AND (v_owner_id IS NULL OR v_target_date IS NULL) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  END IF;

  IF v_owner_id IS NOT NULL OR cardinality(v_contributors) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(array_append(v_contributors, v_owner_id)) assigned(user_id)
      WHERE assigned.user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.organisation_memberships membership
        JOIN public.workspace_memberships workspace_membership
          ON workspace_membership.user_id = membership.user_id
         AND workspace_membership.workspace_id = v_item.workspace_id
        WHERE membership.user_id = assigned.user_id
          AND membership.organisation_id = v_item.organisation_id
          AND membership.status = 'active' AND membership.is_deleted = false
          AND workspace_membership.status = 'active' AND workspace_membership.is_deleted = false
      )
    ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  END IF;

  IF v_command = 'started' THEN
    SELECT coalesce(array_agg(dependency ->> 'recommendationId' ORDER BY dependency ->> 'recommendationId'), '{}')
      INTO v_blocking_dependencies
      FROM jsonb_array_elements(v_item.dependencies) dependency
      WHERE dependency ->> 'type' = 'required'
        AND NOT EXISTS (
          SELECT 1 FROM public.recommendation_portfolio_items required_item
          JOIN public.recommendation_improvement_actions required_action
            ON required_action.portfolio_item_id = required_item.id
           AND required_action.plan_id = v_plan.id
          WHERE required_item.portfolio_id = v_item.portfolio_id
            AND required_item.recommendation_id = dependency ->> 'recommendationId'
            AND required_action.status = 'completed'
        );
    IF cardinality(v_blocking_dependencies) > 0
       AND NOT (v_override AND v_override_ack AND v_override_reason IS NOT NULL) THEN
      RAISE EXCEPTION 'ACTION_DEPENDENCY_BLOCKED';
    END IF;
    IF cardinality(v_blocking_dependencies) = 0
       AND (v_override OR v_override_ack OR v_override_reason IS NOT NULL) THEN
      RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
    END IF;
  ELSIF v_override OR v_override_ack OR v_override_reason IS NOT NULL THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID';
  ELSE
    v_blocking_dependencies := '{}';
  END IF;

  IF v_next = 'completed' AND (
    v_completion_note IS NULL
    OR (cardinality(v_evidence) = 0 AND v_evidence_unavailable IS NULL)
    OR (cardinality(v_evidence) > 0 AND v_evidence_unavailable IS NOT NULL)
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACTION_INVALID'; END IF;
  IF v_next <> 'completed' THEN
    v_completion_note := NULL; v_evidence := '{}'; v_evidence_unavailable := NULL;
  END IF;
  IF v_command <> 'started' THEN
    v_override := false; v_override_ack := false; v_override_reason := NULL;
  END IF;

  INSERT INTO public.recommendation_improvement_action_events (
    action_id, plan_id, portfolio_id, portfolio_item_id, analysis_run_id,
    organisation_id, workspace_id, action_version, command, previous_state, current_state,
    accountable_owner_id, contributor_ids, target_date, note, completion_note,
    evidence_references, evidence_not_available_reason, dependency_override,
    blocking_dependency_ids, dependency_override_reason,
    dependency_override_acknowledged, actor_user_id,
    idempotency_key, payload_hash, occurred_at
  ) VALUES (
    v_action_id, v_plan.id, v_item.portfolio_id, v_item.id, v_item.analysis_run_id,
    v_item.organisation_id, v_item.workspace_id, v_expected_version + 1, v_command,
    v_previous, v_next, v_owner_id, v_contributors, v_target_date, v_note,
    v_completion_note, v_evidence, v_evidence_unavailable, v_override,
    v_blocking_dependencies, v_override_reason, v_override_ack, v_actor_user_id,
    p_input ->> 'idempotency_key',
    p_input ->> 'payload_hash', v_now
  ) RETURNING * INTO v_event;

  IF v_command = 'created' THEN
    INSERT INTO public.recommendation_improvement_actions (
      id, plan_id, portfolio_id, portfolio_item_id, analysis_run_id, recommendation_id,
      recommendation_version, source_decision_id, source_decision_version,
      organisation_id, workspace_id, status, action_version, accountable_owner_id,
      contributor_ids, target_date, note, completion_note, evidence_references,
      evidence_not_available_reason, latest_event_id, created_at, updated_at
    ) VALUES (
      v_action_id, v_plan.id, v_item.portfolio_id, v_item.id, v_item.analysis_run_id,
      v_item.recommendation_id, v_item.recommendation_version, v_decision.id,
      v_decision.decision_version, v_item.organisation_id, v_item.workspace_id,
      v_next, 1, v_owner_id, v_contributors, v_target_date, v_note, v_completion_note,
      v_evidence, v_evidence_unavailable, v_event.id, v_now, v_now
    ) RETURNING * INTO v_current;
  ELSE
    UPDATE public.recommendation_improvement_actions SET
      status = v_next, action_version = v_event.action_version,
      accountable_owner_id = v_owner_id, contributor_ids = v_contributors,
      target_date = v_target_date, note = v_note, completion_note = v_completion_note,
      evidence_references = v_evidence,
      evidence_not_available_reason = v_evidence_unavailable,
      latest_event_id = v_event.id, updated_at = v_now,
      started_at = CASE WHEN v_command = 'started' THEN coalesce(started_at, v_now) ELSE started_at END,
      completed_at = CASE WHEN v_next = 'completed' THEN v_now ELSE NULL END,
      cancelled_at = CASE WHEN v_next = 'cancelled' THEN v_now ELSE NULL END
    WHERE id = v_action_id RETURNING * INTO v_current;
  END IF;
  RETURN v_current;
END;
$$;

ALTER TABLE public.recommendation_improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_improvement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_improvement_action_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_improvement_plans,
  public.recommendation_improvement_actions,
  public.recommendation_improvement_action_events FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_action_event_scope(),
  public.enforce_recommendation_action_projection(),
  public.record_recommendation_improvement_action(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_improvement_plans,
  public.recommendation_improvement_actions,
  public.recommendation_improvement_action_events TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_improvement_action(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_improvement_plans IS
  'Versioned S4-009 improvement plans rooted in immutable recommendation portfolios.';
COMMENT ON TABLE public.recommendation_improvement_actions IS
  'Governed current projection of focused S4-009 recommendation actions.';
COMMENT ON TABLE public.recommendation_improvement_action_events IS
  'Append-only S4-009 action ownership, progress and evidence history.';
