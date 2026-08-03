CREATE TYPE public.recommendation_outcome_direction AS ENUM (
  'increase', 'decrease', 'maintain', 'binary'
);

CREATE TYPE public.recommendation_outcome_status AS ENUM (
  'not_measured', 'baseline_recorded', 'tracking',
  'target_met', 'target_not_met', 'retired'
);

CREATE TABLE public.recommendation_action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL UNIQUE REFERENCES public.recommendation_improvement_actions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  intended_outcome text NOT NULL CHECK (length(btrim(intended_outcome)) BETWEEN 1 AND 1000),
  success_measure_templates jsonb NOT NULL CHECK (
    jsonb_typeof(success_measure_templates) = 'array'
    AND jsonb_array_length(success_measure_templates) > 0
  ),
  policy_version text NOT NULL CHECK (policy_version = 'PDR-004-001/1.0'),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_action_outcome_tenant_match CHECK (
    organisation_id IS NOT NULL AND workspace_id IS NOT NULL
  )
);

CREATE TABLE public.recommendation_outcome_measure_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL REFERENCES public.recommendation_action_outcomes(id) ON DELETE RESTRICT,
  measure_id uuid NOT NULL,
  measure_version integer NOT NULL CHECK (measure_version > 0),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  action_id uuid NOT NULL REFERENCES public.recommendation_improvement_actions(id) ON DELETE RESTRICT,
  source_recommendation_id text NOT NULL,
  source_recommendation_version text NOT NULL CHECK (source_recommendation_version ~ '^\d+\.\d+\.\d+$'),
  source_catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  source_catalogue_version text NOT NULL CHECK (source_catalogue_version ~ '^\d+\.\d+\.\d+$'),
  source_catalogue_digest text NOT NULL CHECK (source_catalogue_digest ~ '^[0-9a-f]{64}$'),
  direction public.recommendation_outcome_direction NOT NULL,
  unit text NOT NULL CHECK (length(btrim(unit)) BETWEEN 1 AND 80),
  decimal_scale integer NOT NULL CHECK (decimal_scale BETWEEN 0 AND 18),
  baseline_numeric numeric,
  baseline_binary boolean,
  baseline_effective_at timestamptz,
  target_numeric numeric,
  target_binary boolean,
  absolute_tolerance numeric,
  target_date date,
  target_timezone text,
  target_deadline_at timestamptz,
  source_description text NOT NULL CHECK (length(btrim(source_description)) BETWEEN 1 AND 500),
  source_reference text CHECK (source_reference IS NULL OR length(btrim(source_reference)) BETWEEN 1 AND 1000),
  cadence text NOT NULL CHECK (length(btrim(cadence)) BETWEEN 1 AND 120),
  accountable_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  retired_at timestamptz,
  supersedes_measure_version_id uuid REFERENCES public.recommendation_outcome_measure_versions(id) ON DELETE RESTRICT,
  policy_version text NOT NULL CHECK (policy_version = 'PDR-004-001/1.0'),
  evaluator_version text NOT NULL CHECK (evaluator_version = 'deliveryiq.outcome-measurement/1.0.0'),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measure_id, measure_version),
  UNIQUE (supersedes_measure_version_id),
  CONSTRAINT recommendation_outcome_measure_value_shape CHECK (
    (direction = 'binary' AND baseline_numeric IS NULL AND target_numeric IS NULL
      AND absolute_tolerance IS NULL AND decimal_scale = 0)
    OR
    (direction <> 'binary' AND baseline_binary IS NULL AND target_binary IS NULL)
  ),
  CONSTRAINT recommendation_outcome_measure_tolerance CHECK (
    (direction = 'maintain' AND absolute_tolerance IS NOT NULL AND absolute_tolerance >= 0)
    OR (direction <> 'maintain' AND absolute_tolerance IS NULL)
  ),
  CONSTRAINT recommendation_outcome_measure_target_date CHECK (
    (target_date IS NULL AND target_timezone IS NULL AND target_deadline_at IS NULL)
    OR (target_date IS NOT NULL AND length(btrim(target_timezone)) > 0 AND target_deadline_at IS NOT NULL)
  )
);

CREATE TABLE public.recommendation_outcome_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_version_id uuid NOT NULL REFERENCES public.recommendation_outcome_measure_versions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  numeric_value numeric,
  binary_value boolean,
  effective_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source_description text NOT NULL CHECK (length(btrim(source_description)) BETWEEN 1 AND 500),
  source_reference text CHECK (source_reference IS NULL OR length(btrim(source_reference)) BETWEEN 1 AND 1000),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  supersedes_observation_id uuid REFERENCES public.recommendation_outcome_observations(id) ON DELETE RESTRICT,
  correction_reason text CHECK (correction_reason IS NULL OR length(btrim(correction_reason)) BETWEEN 1 AND 1000),
  trace_id text NOT NULL CHECK (length(btrim(trace_id)) BETWEEN 1 AND 160),
  UNIQUE (organisation_id, workspace_id, idempotency_key),
  UNIQUE (supersedes_observation_id),
  CONSTRAINT recommendation_outcome_observation_value CHECK (
    (numeric_value IS NOT NULL AND binary_value IS NULL)
    OR (numeric_value IS NULL AND binary_value IS NOT NULL)
  ),
  CONSTRAINT recommendation_outcome_observation_correction CHECK (
    (supersedes_observation_id IS NULL AND correction_reason IS NULL)
    OR (supersedes_observation_id IS NOT NULL AND correction_reason IS NOT NULL)
  )
);

CREATE TABLE public.recommendation_outcome_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_version_id uuid NOT NULL REFERENCES public.recommendation_outcome_measure_versions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  sequence integer NOT NULL CHECK (sequence > 0),
  status public.recommendation_outcome_status NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'measure_configuration_incomplete', 'baseline_missing', 'baseline_only',
    'target_satisfied', 'target_satisfied_late', 'target_pending',
    'target_not_met_by_date', 'no_observation_by_target_date', 'measure_retired'
  )),
  decisive_observation_id uuid REFERENCES public.recommendation_outcome_observations(id) ON DELETE RESTRICT,
  decisive_effective_at timestamptz,
  decisive_recorded_at timestamptz,
  timing text NOT NULL CHECK (timing IN ('on_time', 'late', 'not_applicable')),
  deadline_was_missed boolean NOT NULL,
  recorded_late boolean NOT NULL,
  customer_copy text NOT NULL CHECK (length(btrim(customer_copy)) BETWEEN 1 AND 500),
  trigger_observation_id uuid REFERENCES public.recommendation_outcome_observations(id) ON DELETE RESTRICT,
  facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'object'),
  policy_version text NOT NULL CHECK (policy_version = 'PDR-004-001/1.0'),
  evaluator_version text NOT NULL CHECK (evaluator_version = 'deliveryiq.outcome-measurement/1.0.0'),
  trace_id text NOT NULL CHECK (length(btrim(trace_id)) BETWEEN 1 AND 160),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measure_version_id, sequence)
);

CREATE INDEX recommendation_action_outcomes_tenant_action_idx
  ON public.recommendation_action_outcomes (organisation_id, workspace_id, action_id);
CREATE INDEX recommendation_outcome_measure_versions_tenant_measure_idx
  ON public.recommendation_outcome_measure_versions (
    organisation_id, workspace_id, measure_id, measure_version DESC
  );
CREATE INDEX recommendation_outcome_observations_measure_order_idx
  ON public.recommendation_outcome_observations (
    measure_version_id, effective_at DESC, recorded_at DESC, id ASC
  );
CREATE INDEX recommendation_outcome_status_events_measure_sequence_idx
  ON public.recommendation_outcome_status_events (measure_version_id, sequence DESC);

CREATE TRIGGER recommendation_action_outcomes_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_action_outcomes
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_outcome_measure_versions_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_outcome_measure_versions
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_outcome_observations_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_outcome_observations
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_outcome_status_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_outcome_status_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.is_active_recommendation_outcome_member(
  p_user_id uuid, p_organisation_id uuid, p_workspace_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_memberships membership
    JOIN public.workspace_memberships workspace_membership
      ON workspace_membership.user_id = membership.user_id
     AND workspace_membership.workspace_id = p_workspace_id
    JOIN public.workspaces workspace
      ON workspace.id = p_workspace_id
     AND workspace.organisation_id = p_organisation_id
     AND workspace.is_deleted = false
    WHERE membership.user_id = p_user_id
      AND membership.organisation_id = p_organisation_id
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace_membership.status = 'active'
      AND workspace_membership.is_deleted = false
  );
$$;

CREATE OR REPLACE FUNCTION public.capture_recommendation_action_outcome()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item public.recommendation_portfolio_items;
  v_portfolio public.recommendation_portfolios;
  v_event public.recommendation_improvement_action_events;
BEGIN
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
  WHERE id = NEW.portfolio_item_id AND organisation_id = NEW.organisation_id
    AND workspace_id = NEW.workspace_id;
  SELECT * INTO v_portfolio FROM public.recommendation_portfolios
  WHERE id = NEW.portfolio_id AND organisation_id = NEW.organisation_id
    AND workspace_id = NEW.workspace_id;
  SELECT * INTO v_event FROM public.recommendation_improvement_action_events
  WHERE id = NEW.latest_event_id AND organisation_id = NEW.organisation_id
    AND workspace_id = NEW.workspace_id;
  IF v_item.id IS NULL OR v_portfolio.id IS NULL OR v_event.id IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED';
  END IF;
  INSERT INTO public.recommendation_action_outcomes (
    action_id, organisation_id, workspace_id, portfolio_item_id,
    recommendation_definition_id, recommendation_id, recommendation_version,
    catalogue_version_id, catalogue_version, catalogue_digest,
    intended_outcome, success_measure_templates, policy_version, created_by_user_id
  ) VALUES (
    NEW.id, NEW.organisation_id, NEW.workspace_id, v_item.id,
    v_item.recommendation_definition_id, v_item.recommendation_id,
    v_item.recommendation_version, v_portfolio.catalogue_version_id,
    v_portfolio.catalogue_version, v_portfolio.catalogue_digest,
    v_item.outcome, v_item.success_measures, 'PDR-004-001/1.0', v_event.actor_user_id
  ) ON CONFLICT (action_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_action_outcome_capture
AFTER INSERT ON public.recommendation_improvement_actions
FOR EACH ROW EXECUTE FUNCTION public.capture_recommendation_action_outcome();

INSERT INTO public.recommendation_action_outcomes (
  action_id, organisation_id, workspace_id, portfolio_item_id,
  recommendation_definition_id, recommendation_id, recommendation_version,
  catalogue_version_id, catalogue_version, catalogue_digest,
  intended_outcome, success_measure_templates, policy_version, created_by_user_id, created_at
)
SELECT action.id, action.organisation_id, action.workspace_id, item.id,
  item.recommendation_definition_id, item.recommendation_id, item.recommendation_version,
  portfolio.catalogue_version_id, portfolio.catalogue_version, portfolio.catalogue_digest,
  item.outcome, item.success_measures, 'PDR-004-001/1.0', event.actor_user_id, action.created_at
FROM public.recommendation_improvement_actions action
JOIN public.recommendation_portfolio_items item ON item.id = action.portfolio_item_id
JOIN public.recommendation_portfolios portfolio ON portfolio.id = action.portfolio_id
JOIN public.recommendation_improvement_action_events event ON event.id = action.latest_event_id
ON CONFLICT (action_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_recommendation_action_outcome(p_input jsonb)
RETURNS public.recommendation_action_outcomes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_action public.recommendation_improvement_actions;
  v_item public.recommendation_portfolio_items;
  v_portfolio public.recommendation_portfolios;
  v_result public.recommendation_action_outcomes;
BEGIN
  SELECT * INTO v_action FROM public.recommendation_improvement_actions
  WHERE id = (p_input->>'action_id')::uuid
    AND organisation_id = (p_input->>'organisation_id')::uuid
    AND workspace_id = (p_input->>'workspace_id')::uuid;
  IF v_action.id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  IF NOT public.is_active_recommendation_outcome_member(
    (p_input->>'actor_user_id')::uuid, v_action.organisation_id, v_action.workspace_id
  ) THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
  WHERE id = v_action.portfolio_item_id
    AND organisation_id = v_action.organisation_id AND workspace_id = v_action.workspace_id;
  SELECT * INTO v_portfolio FROM public.recommendation_portfolios
  WHERE id = v_action.portfolio_id
    AND organisation_id = v_action.organisation_id AND workspace_id = v_action.workspace_id;
  IF v_item.id IS NULL OR v_portfolio.id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;

  INSERT INTO public.recommendation_action_outcomes (
    action_id, organisation_id, workspace_id, portfolio_item_id,
    recommendation_definition_id, recommendation_id, recommendation_version,
    catalogue_version_id, catalogue_version, catalogue_digest,
    intended_outcome, success_measure_templates, policy_version, created_by_user_id
  ) VALUES (
    v_action.id, v_action.organisation_id, v_action.workspace_id, v_item.id,
    v_item.recommendation_definition_id, v_item.recommendation_id, v_item.recommendation_version,
    v_portfolio.catalogue_version_id, v_portfolio.catalogue_version, v_portfolio.catalogue_digest,
    v_item.outcome, v_item.success_measures, 'PDR-004-001/1.0',
    (p_input->>'actor_user_id')::uuid
  ) ON CONFLICT (action_id) DO NOTHING;
  SELECT * INTO v_result FROM public.recommendation_action_outcomes WHERE action_id = v_action.id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_recommendation_outcome_measure_version(p_input jsonb)
RETURNS public.recommendation_outcome_measure_versions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_outcome public.recommendation_action_outcomes;
  v_previous public.recommendation_outcome_measure_versions;
  v_measure_id uuid;
  v_version integer;
  v_result public.recommendation_outcome_measure_versions;
  v_event jsonb := p_input->'projection';
BEGIN
  SELECT * INTO v_outcome FROM public.recommendation_action_outcomes
  WHERE id = (p_input->>'outcome_id')::uuid
    AND organisation_id = (p_input->>'organisation_id')::uuid
    AND workspace_id = (p_input->>'workspace_id')::uuid;
  IF v_outcome.id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  IF NOT public.is_active_recommendation_outcome_member(
      (p_input->>'actor_user_id')::uuid, v_outcome.organisation_id, v_outcome.workspace_id
    ) OR NOT public.is_active_recommendation_outcome_member(
      (p_input->>'accountable_owner_id')::uuid, v_outcome.organisation_id, v_outcome.workspace_id
    ) THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;

  IF NULLIF(p_input->>'measure_id', '') IS NULL THEN
    IF COALESCE((p_input->>'expected_version')::integer, 0) <> 0 THEN
      RAISE EXCEPTION 'OUTCOME_VERSION_CONFLICT';
    END IF;
    v_measure_id := gen_random_uuid(); v_version := 1;
  ELSE
    v_measure_id := (p_input->>'measure_id')::uuid;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_measure_id::text, 0));
    SELECT * INTO v_previous FROM public.recommendation_outcome_measure_versions
    WHERE measure_id = v_measure_id AND organisation_id = v_outcome.organisation_id
      AND workspace_id = v_outcome.workspace_id
    ORDER BY measure_version DESC LIMIT 1 FOR UPDATE;
    IF v_previous.id IS NULL OR v_previous.outcome_id <> v_outcome.id THEN
      RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED';
    END IF;
    IF v_previous.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'OUTCOME_VERSION_CONFLICT';
    END IF;
    IF v_previous.measure_version <> (p_input->>'expected_version')::integer THEN
      RAISE EXCEPTION 'OUTCOME_VERSION_CONFLICT';
    END IF;
    v_version := v_previous.measure_version + 1;
  END IF;

  INSERT INTO public.recommendation_outcome_measure_versions (
    outcome_id, measure_id, measure_version, organisation_id, workspace_id, action_id,
    source_recommendation_id, source_recommendation_version, source_catalogue_version_id,
    source_catalogue_version, source_catalogue_digest, direction, unit, decimal_scale,
    baseline_numeric, baseline_binary, baseline_effective_at,
    target_numeric, target_binary, absolute_tolerance,
    target_date, target_timezone, target_deadline_at,
    source_description, source_reference, cadence, accountable_owner_id,
    retired_at, supersedes_measure_version_id, policy_version, evaluator_version, created_by_user_id
  ) VALUES (
    v_outcome.id, v_measure_id, v_version, v_outcome.organisation_id, v_outcome.workspace_id,
    v_outcome.action_id, v_outcome.recommendation_id, v_outcome.recommendation_version,
    v_outcome.catalogue_version_id, v_outcome.catalogue_version, v_outcome.catalogue_digest,
    (p_input->>'direction')::public.recommendation_outcome_direction,
    p_input->>'unit', (p_input->>'decimal_scale')::integer,
    CASE WHEN p_input->>'baseline_kind' = 'numeric' THEN (p_input->>'baseline_value')::numeric END,
    CASE WHEN p_input->>'baseline_kind' = 'binary' THEN (p_input->>'baseline_value')::boolean END,
    NULLIF(p_input->>'baseline_effective_at', '')::timestamptz,
    CASE WHEN p_input->>'target_kind' = 'numeric' THEN (p_input->>'target_value')::numeric END,
    CASE WHEN p_input->>'target_kind' = 'binary' THEN (p_input->>'target_value')::boolean END,
    NULLIF(p_input->>'absolute_tolerance', '')::numeric,
    NULLIF(p_input->>'target_date', '')::date, NULLIF(p_input->>'target_timezone', ''),
    NULLIF(p_input->>'target_deadline_at', '')::timestamptz,
    p_input->>'source_description', NULLIF(p_input->>'source_reference', ''),
    p_input->>'cadence', (p_input->>'accountable_owner_id')::uuid,
    NULLIF(p_input->>'retired_at', '')::timestamptz, v_previous.id,
    'PDR-004-001/1.0', 'deliveryiq.outcome-measurement/1.0.0',
    (p_input->>'actor_user_id')::uuid
  ) RETURNING * INTO v_result;

  INSERT INTO public.recommendation_outcome_status_events (
    measure_version_id, organisation_id, workspace_id, sequence, status, reason_code,
    decisive_observation_id, decisive_effective_at, decisive_recorded_at, timing,
    deadline_was_missed, recorded_late, customer_copy, trigger_observation_id,
    facts, policy_version, evaluator_version, trace_id
  ) VALUES (
    v_result.id, v_result.organisation_id, v_result.workspace_id, 1,
    (v_event->>'status')::public.recommendation_outcome_status, v_event->>'reasonCode',
    NULL, NULL, NULL, v_event->>'satisfactionTiming',
    (v_event->>'deadlineWasMissed')::boolean, (v_event->>'recordedLate')::boolean,
    v_event->>'customerCopy', NULL, COALESCE(p_input->'facts', '{}'::jsonb),
    'PDR-004-001/1.0', 'deliveryiq.outcome-measurement/1.0.0', p_input->>'trace_id'
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_recommendation_outcome_observation(p_input jsonb)
RETURNS public.recommendation_outcome_observations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_measure public.recommendation_outcome_measure_versions;
  v_superseded public.recommendation_outcome_observations;
  v_replay public.recommendation_outcome_observations;
  v_result public.recommendation_outcome_observations;
  v_sequence integer;
  v_observation_count integer;
  v_event jsonb := p_input->'projection';
BEGIN
  SELECT * INTO v_measure FROM public.recommendation_outcome_measure_versions
  WHERE id = (p_input->>'measure_version_id')::uuid
    AND organisation_id = (p_input->>'organisation_id')::uuid
    AND workspace_id = (p_input->>'workspace_id')::uuid;
  IF v_measure.id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  IF NOT public.is_active_recommendation_outcome_member(
    (p_input->>'actor_user_id')::uuid, v_measure.organisation_id, v_measure.workspace_id
  ) THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  IF v_measure.retired_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.recommendation_outcome_measure_versions newer
    WHERE newer.measure_id = v_measure.measure_id
      AND newer.measure_version > v_measure.measure_version
  ) THEN RAISE EXCEPTION 'OUTCOME_VERSION_CONFLICT'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_measure.id::text, 0));

  SELECT * INTO v_replay FROM public.recommendation_outcome_observations
  WHERE organisation_id = v_measure.organisation_id AND workspace_id = v_measure.workspace_id
    AND idempotency_key = p_input->>'idempotency_key';
  IF v_replay.id IS NOT NULL THEN
    IF v_replay.measure_version_id <> v_measure.id OR v_replay.payload_hash <> p_input->>'payload_hash' THEN
      RAISE EXCEPTION 'OUTCOME_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_replay;
  END IF;

  SELECT count(*) INTO v_observation_count
  FROM public.recommendation_outcome_observations
  WHERE measure_version_id = v_measure.id;
  IF v_observation_count <> (p_input->>'expected_observation_count')::integer THEN
    RAISE EXCEPTION 'OUTCOME_PROJECTION_STALE';
  END IF;

  IF NULLIF(p_input->>'supersedes_observation_id', '') IS NOT NULL THEN
    SELECT * INTO v_superseded FROM public.recommendation_outcome_observations
    WHERE id = (p_input->>'supersedes_observation_id')::uuid
      AND measure_version_id = v_measure.id
      AND organisation_id = v_measure.organisation_id AND workspace_id = v_measure.workspace_id;
    IF v_superseded.id IS NULL OR NULLIF(p_input->>'correction_reason', '') IS NULL THEN
      RAISE EXCEPTION 'OUTCOME_SUPERSESSION_INVALID';
    END IF;
    IF EXISTS (SELECT 1 FROM public.recommendation_outcome_observations
      WHERE supersedes_observation_id = v_superseded.id) THEN
      RAISE EXCEPTION 'OUTCOME_SUPERSESSION_INVALID';
    END IF;
  ELSIF NULLIF(p_input->>'correction_reason', '') IS NOT NULL THEN
    RAISE EXCEPTION 'OUTCOME_SUPERSESSION_INVALID';
  END IF;

  INSERT INTO public.recommendation_outcome_observations (
    id, measure_version_id, organisation_id, workspace_id, numeric_value, binary_value,
    effective_at, source_description, source_reference, actor_user_id,
    idempotency_key, payload_hash, supersedes_observation_id, correction_reason, trace_id
  ) VALUES (
    (p_input->>'observation_id')::uuid, v_measure.id, v_measure.organisation_id, v_measure.workspace_id,
    CASE WHEN p_input->>'value_kind' = 'numeric' THEN (p_input->>'value')::numeric END,
    CASE WHEN p_input->>'value_kind' = 'binary' THEN (p_input->>'value')::boolean END,
    (p_input->>'effective_at')::timestamptz, p_input->>'source_description',
    NULLIF(p_input->>'source_reference', ''), (p_input->>'actor_user_id')::uuid,
    p_input->>'idempotency_key', p_input->>'payload_hash',
    NULLIF(p_input->>'supersedes_observation_id', '')::uuid,
    NULLIF(p_input->>'correction_reason', ''), p_input->>'trace_id'
  ) RETURNING * INTO v_result;

  SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
  FROM public.recommendation_outcome_status_events WHERE measure_version_id = v_measure.id;
  IF NULLIF(v_event->>'decisiveObservationId', '') IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM public.recommendation_outcome_observations
       WHERE id = (v_event->>'decisiveObservationId')::uuid AND measure_version_id = v_measure.id) THEN
    RAISE EXCEPTION 'OUTCOME_PROJECTION_INVALID';
  END IF;
  INSERT INTO public.recommendation_outcome_status_events (
    measure_version_id, organisation_id, workspace_id, sequence, status, reason_code,
    decisive_observation_id, decisive_effective_at, decisive_recorded_at, timing,
    deadline_was_missed, recorded_late, customer_copy, trigger_observation_id,
    facts, policy_version, evaluator_version, trace_id
  ) VALUES (
    v_measure.id, v_measure.organisation_id, v_measure.workspace_id, v_sequence,
    (v_event->>'status')::public.recommendation_outcome_status, v_event->>'reasonCode',
    NULLIF(v_event->>'decisiveObservationId', '')::uuid,
    NULLIF(v_event->>'decisiveEffectiveAt', '')::timestamptz,
    NULLIF(v_event->>'decisiveRecordedAt', '')::timestamptz, v_event->>'satisfactionTiming',
    (v_event->>'deadlineWasMissed')::boolean, (v_event->>'recordedLate')::boolean,
    v_event->>'customerCopy', v_result.id, COALESCE(p_input->'facts', '{}'::jsonb),
    'PDR-004-001/1.0', 'deliveryiq.outcome-measurement/1.0.0', p_input->>'trace_id'
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_recommendation_outcome_status_event(p_input jsonb)
RETURNS public.recommendation_outcome_status_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_measure public.recommendation_outcome_measure_versions;
  v_latest public.recommendation_outcome_status_events;
  v_result public.recommendation_outcome_status_events;
  v_event jsonb := p_input->'projection';
BEGIN
  SELECT * INTO v_measure FROM public.recommendation_outcome_measure_versions
  WHERE id = (p_input->>'measure_version_id')::uuid
    AND organisation_id = (p_input->>'organisation_id')::uuid
    AND workspace_id = (p_input->>'workspace_id')::uuid;
  IF v_measure.id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ACCESS_DENIED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_measure.id::text, 0));
  SELECT * INTO v_latest FROM public.recommendation_outcome_status_events
  WHERE measure_version_id = v_measure.id ORDER BY sequence DESC LIMIT 1;
  IF v_latest.status::text = v_event->>'status'
     AND v_latest.reason_code = v_event->>'reasonCode'
     AND v_latest.decisive_observation_id IS NOT DISTINCT FROM NULLIF(v_event->>'decisiveObservationId', '')::uuid
     AND v_latest.timing = v_event->>'satisfactionTiming'
     AND v_latest.deadline_was_missed = (v_event->>'deadlineWasMissed')::boolean
     AND v_latest.recorded_late = (v_event->>'recordedLate')::boolean THEN
    RETURN v_latest;
  END IF;
  INSERT INTO public.recommendation_outcome_status_events (
    measure_version_id, organisation_id, workspace_id, sequence, status, reason_code,
    decisive_observation_id, decisive_effective_at, decisive_recorded_at, timing,
    deadline_was_missed, recorded_late, customer_copy, trigger_observation_id,
    facts, policy_version, evaluator_version, trace_id
  ) VALUES (
    v_measure.id, v_measure.organisation_id, v_measure.workspace_id,
    COALESCE(v_latest.sequence, 0) + 1,
    (v_event->>'status')::public.recommendation_outcome_status, v_event->>'reasonCode',
    NULLIF(v_event->>'decisiveObservationId', '')::uuid,
    NULLIF(v_event->>'decisiveEffectiveAt', '')::timestamptz,
    NULLIF(v_event->>'decisiveRecordedAt', '')::timestamptz, v_event->>'satisfactionTiming',
    (v_event->>'deadlineWasMissed')::boolean, (v_event->>'recordedLate')::boolean,
    v_event->>'customerCopy', NULL, COALESCE(p_input->'facts', '{}'::jsonb),
    'PDR-004-001/1.0', 'deliveryiq.outcome-measurement/1.0.0', p_input->>'trace_id'
  ) RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

ALTER TABLE public.recommendation_action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcome_measure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcome_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcome_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_recommendation_action_outcome(jsonb),
  public.create_recommendation_outcome_measure_version(jsonb),
  public.record_recommendation_outcome_observation(jsonb),
  public.append_recommendation_outcome_status_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_recommendation_action_outcome()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_active_recommendation_outcome_member(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recommendation_action_outcome(jsonb),
  public.create_recommendation_outcome_measure_version(jsonb),
  public.record_recommendation_outcome_observation(jsonb),
  public.append_recommendation_outcome_status_event(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_action_outcomes IS
  'Immutable S4-010 snapshot of the catalogue outcome and success-measure templates associated with an improvement action.';
COMMENT ON TABLE public.recommendation_outcome_observations IS
  'Immutable tenant-scoped outcome observations; later corrections supersede rather than mutate evidence.';
