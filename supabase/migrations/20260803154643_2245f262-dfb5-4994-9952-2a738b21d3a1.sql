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
    WHEN 'outcome' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_action_outcomes WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
    WHEN 'handoff' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_product_handoffs WHERE id::text = v_object_id AND organisation_id = v_organisation_id AND workspace_id = v_workspace_id) INTO v_source_valid;
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

REVOKE EXECUTE ON FUNCTION public.capture_recommendation_analytics_event(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_recommendation_analytics_event(jsonb) TO service_role;