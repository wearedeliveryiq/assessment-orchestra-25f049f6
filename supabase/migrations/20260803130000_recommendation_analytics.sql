CREATE TYPE public.recommendation_analytics_consent_status AS ENUM ('granted', 'withdrawn');
CREATE TYPE public.recommendation_analytics_event_type AS ENUM (
  'portfolio_viewed', 'explanation_opened', 'decision_recorded',
  'action_started', 'action_blocked', 'action_completed', 'outcome_observed',
  'knowledge_pack_handoff', 'teammate_handoff', 'usefulness_submitted'
);
CREATE TYPE public.recommendation_analytics_mode AS ENUM ('workspace', 'executive_report');

CREATE TABLE public.recommendation_analytics_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.recommendation_analytics_consent_status NOT NULL,
  consent_version integer NOT NULL CHECK (consent_version > 0),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 8 AND 160),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_analytics_consent_version_unique
    UNIQUE (organisation_id, user_id, consent_version)
);

CREATE INDEX recommendation_analytics_consent_lookup_idx
  ON public.recommendation_analytics_consent_events
  (organisation_id, user_id, consent_version DESC);

CREATE OR REPLACE FUNCTION public.validate_recommendation_analytics_properties(
  p_event_type public.recommendation_analytics_event_type,
  p_properties jsonb
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_keys text[];
BEGIN
  IF jsonb_typeof(p_properties) <> 'object' THEN RETURN false; END IF;
  SELECT coalesce(array_agg(key ORDER BY key), ARRAY[]::text[])
  INTO v_keys FROM jsonb_object_keys(p_properties) key;
  CASE p_event_type
    WHEN 'decision_recorded' THEN
      RETURN v_keys = ARRAY['decision_state']
        AND p_properties ->> 'decision_state' IN ('undecided','accepted','deferred','rejected','superseded');
    WHEN 'action_started' THEN
      RETURN v_keys = ARRAY['action_state'] AND p_properties ->> 'action_state' = 'in_progress';
    WHEN 'action_blocked' THEN
      RETURN v_keys = ARRAY['action_state'] AND p_properties ->> 'action_state' = 'blocked';
    WHEN 'action_completed' THEN
      RETURN v_keys = ARRAY['action_state'] AND p_properties ->> 'action_state' = 'completed';
    WHEN 'knowledge_pack_handoff' THEN
      RETURN v_keys = ARRAY['handoff_state'] AND p_properties ->> 'handoff_state' = 'consumed';
    WHEN 'teammate_handoff' THEN
      RETURN v_keys = ARRAY['handoff_state'] AND p_properties ->> 'handoff_state' = 'consumed';
    WHEN 'usefulness_submitted' THEN
      RETURN v_keys = ARRAY['usefulness']
        AND p_properties ->> 'usefulness' IN ('helpful','not_helpful');
    ELSE
      RETURN v_keys = ARRAY[]::text[];
  END CASE;
END;
$$;

CREATE TABLE public.recommendation_analytics_events (
  event_id text PRIMARY KEY CHECK (
    length(event_id) BETWEEN 8 AND 160 AND event_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  actor_pseudonym text NOT NULL CHECK (actor_pseudonym ~ '^[0-9a-f]{64}$'),
  event_type public.recommendation_analytics_event_type NOT NULL,
  object_type text NOT NULL CHECK (
    object_type IN ('portfolio','portfolio_item','decision','action','outcome','handoff')
  ),
  object_id text NOT NULL CHECK (
    length(object_id) BETWEEN 1 AND 160 AND object_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  object_version text NOT NULL CHECK (
    length(object_version) BETWEEN 1 AND 100 AND object_version ~ '^[A-Za-z0-9._:-]+$'
  ),
  mode public.recommendation_analytics_mode NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_event_id uuid NOT NULL REFERENCES public.recommendation_analytics_consent_events(id) ON DELETE RESTRICT,
  schema_version text NOT NULL CHECK (schema_version = 'deliveryiq.recommendation-analytics/1.0.0'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT recommendation_analytics_properties_allowed CHECK (
    public.validate_recommendation_analytics_properties(event_type, properties)
  ),
  CONSTRAINT recommendation_analytics_event_object_contract CHECK (
    (event_type = 'portfolio_viewed' AND object_type = 'portfolio')
    OR (event_type IN ('explanation_opened','usefulness_submitted') AND object_type = 'portfolio_item')
    OR (event_type = 'decision_recorded' AND object_type = 'decision')
    OR (event_type IN ('action_started','action_blocked','action_completed') AND object_type = 'action')
    OR (event_type = 'outcome_observed' AND object_type = 'outcome')
    OR (event_type IN ('knowledge_pack_handoff','teammate_handoff') AND object_type = 'handoff')
  )
);

CREATE INDEX recommendation_analytics_events_tenant_time_idx
  ON public.recommendation_analytics_events (organisation_id, workspace_id, occurred_at DESC);
CREATE INDEX recommendation_analytics_events_aggregate_idx
  ON public.recommendation_analytics_events (event_type, mode, occurred_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX recommendation_analytics_events_retention_idx
  ON public.recommendation_analytics_events (occurred_at)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_recommendation_analytics_event_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.recommendation_analytics_retention', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.archived_at IS NOT NULL
       AND OLD.archived_at IS NULL
       AND to_jsonb(NEW) - 'archived_at' = to_jsonb(OLD) - 'archived_at' THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_IMMUTABLE';
END;
$$;

CREATE TRIGGER recommendation_analytics_consent_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_analytics_consent_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TRIGGER recommendation_analytics_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_analytics_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_analytics_event_immutable();

CREATE OR REPLACE FUNCTION public.set_recommendation_analytics_consent(p_input jsonb)
RETURNS public.recommendation_analytics_consent_events
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.recommendation_analytics_consent_events;
  v_result public.recommendation_analytics_consent_events;
  v_organisation_id uuid := (p_input ->> 'organisationId')::uuid;
  v_workspace_id uuid := (p_input ->> 'workspaceId')::uuid;
  v_user_id uuid := (p_input ->> 'userId')::uuid;
  v_status public.recommendation_analytics_consent_status := (p_input ->> 'status')::public.recommendation_analytics_consent_status;
  v_key text := p_input ->> 'idempotencyKey';
  v_hash text := p_input ->> 'requestHash';
  v_version integer;
BEGIN
  IF v_key IS NULL OR length(v_key) NOT BETWEEN 8 AND 160
     OR v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_CONSENT_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships membership
    JOIN public.workspaces workspace ON workspace.id = v_workspace_id
    WHERE membership.organisation_id = v_organisation_id
      AND membership.user_id = v_user_id
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace.organisation_id = v_organisation_id AND workspace.is_deleted = false
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('recommendation-analytics-consent:' || v_organisation_id::text || ':' || v_user_id::text, 0)
  );
  SELECT * INTO v_existing FROM public.recommendation_analytics_consent_events
    WHERE idempotency_key = v_key;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_existing;
  END IF;
  SELECT coalesce(max(consent_version), 0) + 1 INTO v_version
  FROM public.recommendation_analytics_consent_events
  WHERE organisation_id = v_organisation_id AND user_id = v_user_id;
  INSERT INTO public.recommendation_analytics_consent_events (
    organisation_id, workspace_id, user_id, status, consent_version,
    idempotency_key, request_hash
  ) VALUES (
    v_organisation_id, v_workspace_id, v_user_id, v_status, v_version, v_key, v_hash
  ) RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_recommendation_analytics_event(p_input jsonb)
RETURNS public.recommendation_analytics_events
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.recommendation_analytics_events;
  v_result public.recommendation_analytics_events;
  v_consent public.recommendation_analytics_consent_events;
  v_event_id text := p_input ->> 'eventId';
  v_organisation_id uuid := (p_input ->> 'organisationId')::uuid;
  v_workspace_id uuid := (p_input ->> 'workspaceId')::uuid;
  v_user_id uuid := (p_input ->> 'actorUserId')::uuid;
  v_type public.recommendation_analytics_event_type := (p_input ->> 'eventType')::public.recommendation_analytics_event_type;
  v_object_type text := p_input ->> 'objectType';
  v_object_id text := p_input ->> 'objectId';
  v_properties jsonb := coalesce(p_input -> 'properties', '{}'::jsonb);
  v_hash text := p_input ->> 'requestHash';
  v_source_valid boolean := false;
BEGIN
  IF v_event_id IS NULL OR length(v_event_id) NOT BETWEEN 8 AND 160
     OR v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'actorPseudonym' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'schemaVersion' <> 'deliveryiq.recommendation-analytics/1.0.0'
     OR NOT public.validate_recommendation_analytics_properties(v_type, v_properties) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships membership
    JOIN public.workspaces workspace ON workspace.id = v_workspace_id
    WHERE membership.organisation_id = v_organisation_id
      AND membership.user_id = v_user_id
      AND membership.status = 'active' AND membership.is_deleted = false
      AND workspace.organisation_id = v_organisation_id AND workspace.is_deleted = false
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  SELECT * INTO v_consent FROM public.recommendation_analytics_consent_events
  WHERE organisation_id = v_organisation_id AND user_id = v_user_id
  ORDER BY consent_version DESC LIMIT 1;
  IF v_consent.id IS NULL OR v_consent.status <> 'granted'
     OR v_consent.id <> (p_input ->> 'consentEventId')::uuid THEN
    RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_CONSENT_REQUIRED';
  END IF;
  CASE v_object_type
    WHEN 'portfolio' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_portfolios WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    WHEN 'portfolio_item' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_portfolio_items WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    WHEN 'decision' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_item_decisions WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    WHEN 'action' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_improvement_actions WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    WHEN 'handoff' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_product_handoffs WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    -- S4-010 has no governed outcome source yet. The event remains part of the
    -- approved schema but cannot be persisted until its tenant-owned source
    -- can be verified.
    WHEN 'outcome' THEN v_source_valid := false;
    ELSE v_source_valid := false;
  END CASE;
  IF NOT v_source_valid THEN RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED'; END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('recommendation-analytics-event:' || v_event_id, 0)
  );
  SELECT * INTO v_existing FROM public.recommendation_analytics_events WHERE event_id = v_event_id;
  IF v_existing.event_id IS NOT NULL THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_existing;
  END IF;
  INSERT INTO public.recommendation_analytics_events (
    event_id, organisation_id, workspace_id, actor_pseudonym, event_type,
    object_type, object_id, object_version, mode, properties, consent_event_id,
    schema_version, request_hash, occurred_at
  ) VALUES (
    v_event_id, v_organisation_id, v_workspace_id, p_input ->> 'actorPseudonym', v_type,
    v_object_type, v_object_id, p_input ->> 'objectVersion',
    (p_input ->> 'mode')::public.recommendation_analytics_mode,
    v_properties, v_consent.id, p_input ->> 'schemaVersion', v_hash,
    (p_input ->> 'occurredAt')::timestamptz
  ) RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.recommendation_analytics_product_aggregate(
  p_from timestamptz, p_to timestamptz
) RETURNS TABLE (
  event_type public.recommendation_analytics_event_type,
  mode public.recommendation_analytics_mode,
  properties jsonb,
  tenant_count bigint,
  event_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT event.event_type, event.mode, event.properties,
         count(DISTINCT event.organisation_id), count(*)
  FROM public.recommendation_analytics_events event
  WHERE event.occurred_at >= p_from AND event.occurred_at < p_to
    AND event.archived_at IS NULL
  GROUP BY event.event_type, event.mode, event.properties
  HAVING count(DISTINCT event.organisation_id) >= 10
  ORDER BY event.event_type, event.mode, event.properties::text;
$$;

CREATE OR REPLACE FUNCTION public.apply_recommendation_analytics_retention(
  p_organisation_id uuid,
  p_mode text,
  p_cutoff timestamptz,
  p_limit integer DEFAULT 5000
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids text[];
  v_count integer;
BEGIN
  IF p_mode NOT IN ('archive','purge') OR p_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'RECOMMENDATION_ANALYTICS_RETENTION_INVALID';
  END IF;
  SELECT array_agg(event_id) INTO v_ids FROM (
    SELECT event_id FROM public.recommendation_analytics_events
    WHERE occurred_at < p_cutoff
      AND (p_organisation_id IS NULL OR organisation_id = p_organisation_id)
      AND (p_mode = 'purge' OR archived_at IS NULL)
    ORDER BY occurred_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  ) candidates;
  IF coalesce(array_length(v_ids, 1), 0) = 0 THEN RETURN 0; END IF;
  PERFORM set_config('app.recommendation_analytics_retention', 'on', true);
  IF p_mode = 'archive' THEN
    UPDATE public.recommendation_analytics_events SET archived_at = now()
    WHERE event_id = ANY(v_ids) AND archived_at IS NULL;
  ELSE
    DELETE FROM public.recommendation_analytics_events WHERE event_id = ANY(v_ids);
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER TABLE public.recommendation_analytics_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_recommendation_analytics_properties(public.recommendation_analytics_event_type,jsonb),
  public.enforce_recommendation_analytics_event_immutable(),
  public.set_recommendation_analytics_consent(jsonb),
  public.capture_recommendation_analytics_event(jsonb),
  public.recommendation_analytics_product_aggregate(timestamptz,timestamptz),
  public.apply_recommendation_analytics_retention(uuid,text,timestamptz,integer)
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_analytics_consent(jsonb),
  public.capture_recommendation_analytics_event(jsonb),
  public.recommendation_analytics_product_aggregate(timestamptz,timestamptz),
  public.apply_recommendation_analytics_retention(uuid,text,timestamptz,integer)
  TO service_role;

COMMENT ON TABLE public.recommendation_analytics_events IS
  'Privacy-safe, tenant-scoped S4-013 product-learning signals. No raw evidence or free text.';
COMMENT ON FUNCTION public.recommendation_analytics_product_aggregate(timestamptz,timestamptz) IS
  'Product reporting projection; every returned cohort contains at least ten distinct tenants.';
