CREATE TABLE public.delivery_dna_overview_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  saved_snapshot_id uuid NOT NULL REFERENCES public.delivery_dna_snapshot_sessions(id) ON DELETE RESTRICT,
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  offer_id text NOT NULL,
  offer_version text NOT NULL CHECK (offer_version ~ '^\d+\.\d+\.\d+$'),
  product_id text NOT NULL,
  product_version text NOT NULL CHECK (product_version ~ '^\d+\.\d+\.\d+$'),
  access_key text NOT NULL,
  access_version text NOT NULL CHECK (access_version ~ '^\d+\.\d+\.\d+$'),
  charge_type text NOT NULL CHECK (charge_type = 'one_off'),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  provider text NOT NULL,
  provider_price_reference text NOT NULL,
  provider_checkout_id text UNIQUE,
  provider_checkout_url text CHECK (provider_checkout_url IS NULL OR provider_checkout_url ~ '^https://'),
  idempotency_scope_key text NOT NULL CHECK (idempotency_scope_key ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'pending_provider'
    CHECK (status IN ('pending_provider', 'awaiting_payment', 'succeeded', 'failed', 'cancelled', 'verification_failed')),
  safe_status text,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_dna_overview_checkout_terminal_state CHECK (
    (status = 'succeeded' AND completed_at IS NOT NULL)
    OR (status <> 'succeeded' AND completed_at IS NULL)
  ),
  CONSTRAINT delivery_dna_overview_checkout_expiry CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX delivery_dna_overview_checkout_active_scope_idx
  ON public.delivery_dna_overview_checkouts (
    purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id,
    assessment_session_id, offer_id, offer_version
  )
  WHERE status IN ('pending_provider', 'awaiting_payment', 'succeeded');
CREATE INDEX delivery_dna_overview_checkout_tenant_idx
  ON public.delivery_dna_overview_checkouts (organisation_id, workspace_id, created_at DESC);

CREATE TABLE public.delivery_dna_overview_payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  provider_checkout_id text,
  checkout_id uuid REFERENCES public.delivery_dna_overview_checkouts(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  payment_status text NOT NULL,
  amount_minor integer,
  currency text,
  payload_digest text NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
  verification_status text NOT NULL CHECK (verification_status IN ('accepted', 'rejected', 'ignored')),
  safe_status text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_dna_overview_payment_checkout_idx
  ON public.delivery_dna_overview_payment_events (checkout_id, processed_at DESC);

CREATE TABLE public.delivery_dna_overview_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  saved_snapshot_id uuid NOT NULL REFERENCES public.delivery_dna_snapshot_sessions(id) ON DELETE RESTRICT,
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL UNIQUE REFERENCES public.delivery_dna_overview_checkouts(id) ON DELETE RESTRICT,
  payment_event_id bigint NOT NULL UNIQUE REFERENCES public.delivery_dna_overview_payment_events(id) ON DELETE RESTRICT,
  offer_id text NOT NULL,
  offer_version text NOT NULL,
  product_id text NOT NULL,
  product_version text NOT NULL,
  access_key text NOT NULL,
  access_version text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id, assessment_session_id, access_key, access_version)
);

CREATE INDEX delivery_dna_overview_access_tenant_idx
  ON public.delivery_dna_overview_access_grants (organisation_id, workspace_id, assessment_session_id);

CREATE TRIGGER delivery_dna_overview_checkouts_updated_at
BEFORE UPDATE ON public.delivery_dna_overview_checkouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER delivery_dna_overview_payment_events_immutable
BEFORE UPDATE OR DELETE ON public.delivery_dna_overview_payment_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER delivery_dna_overview_access_grants_immutable
BEFORE UPDATE OR DELETE ON public.delivery_dna_overview_access_grants
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.create_delivery_dna_overview_checkout(
  p_purchaser_user_id uuid,
  p_organisation_id uuid,
  p_workspace_id uuid,
  p_saved_snapshot_id uuid,
  p_assessment_session_id uuid,
  p_offer_id text,
  p_offer_version text,
  p_product_id text,
  p_product_version text,
  p_access_key text,
  p_access_version text,
  p_amount_minor integer,
  p_currency text,
  p_provider text,
  p_provider_price_reference text,
  p_idempotency_scope_key text,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_checkout_id uuid;
BEGIN
  IF p_amount_minor <= 0 OR p_currency !~ '^[A-Z]{3}$'
     OR p_offer_version !~ '^\d+\.\d+\.\d+$'
     OR p_product_version !~ '^\d+\.\d+\.\d+$'
     OR p_access_version !~ '^\d+\.\d+\.\d+$'
     OR p_idempotency_scope_key !~ '^[0-9a-f]{64}$'
     OR p_expires_at <= now()
     OR length(trim(p_provider)) = 0
     OR length(trim(p_provider_price_reference)) = 0 THEN
    RAISE EXCEPTION 'OVERVIEW_CHECKOUT_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_scope_key, 0));

  UPDATE public.delivery_dna_overview_checkouts
  SET status = 'cancelled', safe_status = 'checkout_expired'
  WHERE purchaser_user_id = p_purchaser_user_id
    AND organisation_id = p_organisation_id
    AND workspace_id = p_workspace_id
    AND saved_snapshot_id = p_saved_snapshot_id
    AND assessment_session_id = p_assessment_session_id
    AND offer_id = p_offer_id
    AND offer_version = p_offer_version
    AND status IN ('pending_provider', 'awaiting_payment')
    AND expires_at <= now();

  IF NOT EXISTS (
    SELECT 1
    FROM public.delivery_dna_snapshot_sessions snapshot
    JOIN public.assessment_sessions assessment ON assessment.id = snapshot.assessment_session_id
    JOIN public.workspaces workspace ON workspace.id = p_workspace_id
    JOIN public.organisation_memberships membership
      ON membership.organisation_id = p_organisation_id
    WHERE snapshot.id = p_saved_snapshot_id
      AND snapshot.status = 'linked'
      AND snapshot.linked_user_id = p_purchaser_user_id
      AND snapshot.organisation_id = p_organisation_id
      AND snapshot.workspace_id = p_workspace_id
      AND snapshot.assessment_session_id = p_assessment_session_id
      AND assessment.created_by_user_id = p_purchaser_user_id
      AND assessment.organisation_id = p_organisation_id
      AND assessment.workspace_id = p_workspace_id
      AND assessment.assessment_type = 'delivery-dna'
      AND assessment.is_deleted = false
      AND workspace.organisation_id = p_organisation_id
      AND workspace.is_deleted = false
      AND membership.user_id = p_purchaser_user_id
      AND membership.status = 'active'
      AND membership.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'OVERVIEW_CHECKOUT_SCOPE_INVALID';
  END IF;

  SELECT checkout_id INTO v_checkout_id
  FROM public.delivery_dna_overview_access_grants
  WHERE purchaser_user_id = p_purchaser_user_id
    AND organisation_id = p_organisation_id
    AND workspace_id = p_workspace_id
    AND saved_snapshot_id = p_saved_snapshot_id
    AND assessment_session_id = p_assessment_session_id
    AND access_key = p_access_key
    AND access_version = p_access_version;
  IF v_checkout_id IS NOT NULL THEN RETURN v_checkout_id; END IF;

  SELECT id INTO v_checkout_id
  FROM public.delivery_dna_overview_checkouts
  WHERE purchaser_user_id = p_purchaser_user_id
    AND organisation_id = p_organisation_id
    AND workspace_id = p_workspace_id
    AND saved_snapshot_id = p_saved_snapshot_id
    AND assessment_session_id = p_assessment_session_id
    AND offer_id = p_offer_id
    AND offer_version = p_offer_version
    AND status IN ('pending_provider', 'awaiting_payment', 'succeeded')
  ORDER BY created_at DESC LIMIT 1;
  IF v_checkout_id IS NOT NULL THEN RETURN v_checkout_id; END IF;

  INSERT INTO public.delivery_dna_overview_checkouts (
    purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id,
    assessment_session_id, offer_id, offer_version, product_id, product_version,
    access_key, access_version, charge_type, amount_minor, currency, provider,
    provider_price_reference, idempotency_scope_key, expires_at
  ) VALUES (
    p_purchaser_user_id, p_organisation_id, p_workspace_id, p_saved_snapshot_id,
    p_assessment_session_id, p_offer_id, p_offer_version, p_product_id, p_product_version,
    p_access_key, p_access_version, 'one_off', p_amount_minor, p_currency, trim(p_provider),
    trim(p_provider_price_reference), p_idempotency_scope_key, p_expires_at
  ) RETURNING id INTO v_checkout_id;
  RETURN v_checkout_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_delivery_dna_overview_provider_checkout(
  p_checkout_id uuid,
  p_provider_checkout_id text,
  p_provider_checkout_url text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF length(trim(p_provider_checkout_id)) = 0 OR p_provider_checkout_url !~ '^https://' THEN
    RAISE EXCEPTION 'OVERVIEW_CHECKOUT_INVALID';
  END IF;
  UPDATE public.delivery_dna_overview_checkouts
  SET provider_checkout_id = coalesce(provider_checkout_id, trim(p_provider_checkout_id)),
      provider_checkout_url = p_provider_checkout_url,
      status = CASE WHEN status = 'succeeded' THEN status ELSE 'awaiting_payment' END,
      safe_status = CASE WHEN status = 'succeeded' THEN safe_status ELSE NULL END
  WHERE id = p_checkout_id
    AND status IN ('pending_provider', 'awaiting_payment', 'succeeded')
    AND (provider_checkout_id IS NULL OR provider_checkout_id = trim(p_provider_checkout_id));
  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.delivery_dna_overview_checkouts
    WHERE id = p_checkout_id AND provider_checkout_id = trim(p_provider_checkout_id)
      AND provider_checkout_url = p_provider_checkout_url
      AND status IN ('awaiting_payment', 'succeeded')
  ) THEN RAISE EXCEPTION 'OVERVIEW_CHECKOUT_STATE_INVALID'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_delivery_dna_overview_checkout(
  p_checkout_id uuid,
  p_safe_status text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.delivery_dna_overview_checkouts
  SET status = 'failed', safe_status = left(coalesce(nullif(trim(p_safe_status), ''), 'checkout_unavailable'), 100)
  WHERE id = p_checkout_id AND status IN ('pending_provider', 'awaiting_payment');
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfil_delivery_dna_overview_payment(
  p_provider text,
  p_provider_event_id text,
  p_provider_checkout_id text,
  p_event_type text,
  p_payment_status text,
  p_amount_minor integer,
  p_currency text,
  p_payload_digest text,
  p_checkout_id uuid,
  p_purchaser_user_id uuid,
  p_organisation_id uuid,
  p_workspace_id uuid,
  p_saved_snapshot_id uuid,
  p_assessment_session_id uuid,
  p_offer_id text,
  p_offer_version text,
  p_access_key text,
  p_access_version text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_checkout public.delivery_dna_overview_checkouts;
  v_event_id bigint;
  v_grant_id uuid;
  v_existing public.delivery_dna_overview_payment_events;
BEGIN
  IF length(trim(p_provider_event_id)) = 0 OR p_payload_digest !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'OVERVIEW_PAYMENT_EVENT_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_provider_event_id, 0));
  SELECT * INTO v_existing FROM public.delivery_dna_overview_payment_events
    WHERE provider = p_provider AND provider_event_id = p_provider_event_id;
  IF v_existing.id IS NOT NULL THEN
    SELECT id INTO v_grant_id FROM public.delivery_dna_overview_access_grants
      WHERE payment_event_id = v_existing.id;
    RETURN jsonb_build_object(
      'eventId', v_existing.id,
      'grantId', v_grant_id,
      'status', v_existing.safe_status,
      'replayed', true
    );
  END IF;

  SELECT * INTO v_checkout FROM public.delivery_dna_overview_checkouts
    WHERE id = p_checkout_id FOR UPDATE;
  IF v_checkout.id IS NULL THEN
    INSERT INTO public.delivery_dna_overview_payment_events (
      provider, provider_event_id, provider_checkout_id, checkout_id, event_type,
      payment_status, amount_minor, currency, payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, NULL, p_event_type,
      p_payment_status, p_amount_minor, upper(p_currency), p_payload_digest,
      'rejected', 'payment_verification_failed'
    ) RETURNING id INTO v_event_id;
    RETURN jsonb_build_object('eventId', v_event_id, 'grantId', NULL, 'status', 'payment_verification_failed', 'replayed', false);
  END IF;

  IF v_checkout.provider_checkout_id IS NULL
     AND v_checkout.status = 'pending_provider'
     AND length(trim(p_provider_checkout_id)) > 0 THEN
    UPDATE public.delivery_dna_overview_checkouts
    SET provider_checkout_id = trim(p_provider_checkout_id),
        status = 'awaiting_payment'
    WHERE id = v_checkout.id;
    v_checkout.provider_checkout_id := trim(p_provider_checkout_id);
    v_checkout.status := 'awaiting_payment';
  END IF;

  IF p_payment_status <> 'succeeded' THEN
    INSERT INTO public.delivery_dna_overview_payment_events (
      provider, provider_event_id, provider_checkout_id, checkout_id, event_type,
      payment_status, amount_minor, currency, payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
      p_payment_status, p_amount_minor, upper(p_currency), p_payload_digest,
      'ignored', CASE WHEN p_payment_status = 'cancelled' THEN 'payment_cancelled' ELSE 'payment_not_completed' END
    ) RETURNING id INTO v_event_id;
    UPDATE public.delivery_dna_overview_checkouts
      SET status = CASE WHEN p_payment_status = 'cancelled' THEN 'cancelled' ELSE 'failed' END,
          safe_status = CASE WHEN p_payment_status = 'cancelled' THEN 'payment_cancelled' ELSE 'payment_not_completed' END
      WHERE id = v_checkout.id AND status <> 'succeeded';
    RETURN jsonb_build_object('eventId', v_event_id, 'grantId', NULL, 'status', 'payment_not_completed', 'replayed', false);
  END IF;

  IF v_checkout.provider IS DISTINCT FROM p_provider
     OR v_checkout.provider_checkout_id IS DISTINCT FROM p_provider_checkout_id
     OR v_checkout.amount_minor IS DISTINCT FROM p_amount_minor
     OR v_checkout.currency IS DISTINCT FROM upper(p_currency)
     OR v_checkout.purchaser_user_id IS DISTINCT FROM p_purchaser_user_id
     OR v_checkout.organisation_id IS DISTINCT FROM p_organisation_id
     OR v_checkout.workspace_id IS DISTINCT FROM p_workspace_id
     OR v_checkout.saved_snapshot_id IS DISTINCT FROM p_saved_snapshot_id
     OR v_checkout.assessment_session_id IS DISTINCT FROM p_assessment_session_id
     OR v_checkout.offer_id IS DISTINCT FROM p_offer_id
     OR v_checkout.offer_version IS DISTINCT FROM p_offer_version
     OR v_checkout.access_key IS DISTINCT FROM p_access_key
     OR v_checkout.access_version IS DISTINCT FROM p_access_version THEN
    INSERT INTO public.delivery_dna_overview_payment_events (
      provider, provider_event_id, provider_checkout_id, checkout_id, event_type,
      payment_status, amount_minor, currency, payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
      p_payment_status, p_amount_minor, upper(p_currency), p_payload_digest,
      'rejected', 'payment_verification_failed'
    ) RETURNING id INTO v_event_id;
    UPDATE public.delivery_dna_overview_checkouts
      SET status = 'verification_failed', safe_status = 'payment_verification_failed'
      WHERE id = v_checkout.id AND status <> 'succeeded';
    RETURN jsonb_build_object('eventId', v_event_id, 'grantId', NULL, 'status', 'payment_verification_failed', 'replayed', false);
  END IF;

  INSERT INTO public.delivery_dna_overview_payment_events (
    provider, provider_event_id, provider_checkout_id, checkout_id, event_type,
    payment_status, amount_minor, currency, payload_digest, verification_status, safe_status
  ) VALUES (
    p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
    p_payment_status, p_amount_minor, upper(p_currency), p_payload_digest,
    'accepted', 'payment_confirmed'
  ) RETURNING id INTO v_event_id;

  INSERT INTO public.delivery_dna_overview_access_grants (
    purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id,
    assessment_session_id, checkout_id, payment_event_id, offer_id, offer_version,
    product_id, product_version, access_key, access_version, amount_minor, currency
  ) VALUES (
    v_checkout.purchaser_user_id, v_checkout.organisation_id, v_checkout.workspace_id,
    v_checkout.saved_snapshot_id, v_checkout.assessment_session_id, v_checkout.id,
    v_event_id, v_checkout.offer_id, v_checkout.offer_version, v_checkout.product_id,
    v_checkout.product_version, v_checkout.access_key, v_checkout.access_version,
    v_checkout.amount_minor, v_checkout.currency
  ) ON CONFLICT (purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id,
    assessment_session_id, access_key, access_version) DO NOTHING
  RETURNING id INTO v_grant_id;
  IF v_grant_id IS NULL THEN
    SELECT id INTO v_grant_id FROM public.delivery_dna_overview_access_grants
      WHERE purchaser_user_id = v_checkout.purchaser_user_id
        AND organisation_id = v_checkout.organisation_id
        AND workspace_id = v_checkout.workspace_id
        AND saved_snapshot_id = v_checkout.saved_snapshot_id
        AND assessment_session_id = v_checkout.assessment_session_id
        AND access_key = v_checkout.access_key
        AND access_version = v_checkout.access_version;
  END IF;
  UPDATE public.delivery_dna_overview_checkouts
    SET status = 'succeeded', completed_at = coalesce(completed_at, now()), safe_status = 'payment_confirmed'
    WHERE id = v_checkout.id;
  RETURN jsonb_build_object('eventId', v_event_id, 'grantId', v_grant_id, 'status', 'payment_confirmed', 'replayed', false);
END;
$$;

ALTER TABLE public.delivery_dna_overview_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_overview_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_overview_access_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.delivery_dna_overview_checkouts,
  public.delivery_dna_overview_payment_events,
  public.delivery_dna_overview_access_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.delivery_dna_overview_payment_events_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_delivery_dna_overview_checkout(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, text, text, text, text, timestamptz
), public.attach_delivery_dna_overview_provider_checkout(uuid, text, text),
  public.fail_delivery_dna_overview_checkout(uuid, text),
  public.fulfil_delivery_dna_overview_payment(
    text, text, text, text, text, integer, text, text, uuid, uuid, uuid,
    uuid, uuid, uuid, text, text, text, text
  ) FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.delivery_dna_overview_checkouts,
  public.delivery_dna_overview_payment_events,
  public.delivery_dna_overview_access_grants TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_overview_payment_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_overview_checkout(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, text, text, text, text, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_delivery_dna_overview_provider_checkout(uuid, text, text),
  public.fail_delivery_dna_overview_checkout(uuid, text),
  public.fulfil_delivery_dna_overview_payment(
    text, text, text, text, text, integer, text, text, uuid, uuid, uuid,
    uuid, uuid, uuid, text, text, text, text
  ) TO service_role;

COMMENT ON TABLE public.delivery_dna_overview_access_grants IS
  'Immutable one-off Delivery DNA Overview access, scoped to verified purchaser, tenant, Saved Snapshot and linked assessment.';