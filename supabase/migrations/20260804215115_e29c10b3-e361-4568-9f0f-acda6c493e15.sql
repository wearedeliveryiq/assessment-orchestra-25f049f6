ALTER TABLE public.delivery_dna_overview_checkouts
  ADD COLUMN subtotal_minor integer,
  ADD COLUMN vat_amount_minor integer,
  ADD COLUMN customer_total_minor integer,
  ADD COLUMN tax_status text,
  ADD COLUMN tax_policy text,
  ADD COLUMN tax_display text,
  ADD CONSTRAINT delivery_dna_overview_checkout_tax_evidence CHECK (
    (
      subtotal_minor IS NULL AND vat_amount_minor IS NULL AND customer_total_minor IS NULL
      AND tax_status IS NULL AND tax_policy IS NULL AND tax_display IS NULL
    ) OR (
      subtotal_minor IS NOT NULL AND vat_amount_minor IS NOT NULL
      AND customer_total_minor IS NOT NULL AND tax_status IS NOT NULL
      AND tax_policy IS NOT NULL AND tax_display IS NOT NULL
      AND subtotal_minor > 0 AND vat_amount_minor >= 0
      AND customer_total_minor = subtotal_minor + vat_amount_minor
      AND amount_minor = subtotal_minor
      AND length(trim(tax_status)) > 0
      AND length(trim(tax_policy)) > 0
      AND length(trim(tax_display)) > 0
    )
  ) NOT VALID,
  ADD CONSTRAINT delivery_dna_overview_checkout_offer_1_0_1 CHECK (
    offer_version <> '1.0.1' OR (
      subtotal_minor = 29500 AND vat_amount_minor = 0 AND customer_total_minor = 29500
      AND currency = 'GBP' AND tax_status = 'supplier_not_vat_registered'
      AND tax_policy = 'no_vat_charged_supplier_not_vat_registered'
      AND tax_display = 'No VAT charged — DeliveryIQ is not VAT registered.'
    )
  ) NOT VALID;

ALTER TABLE public.delivery_dna_overview_payment_events
  ADD COLUMN subtotal_minor integer,
  ADD COLUMN vat_amount_minor integer,
  ADD COLUMN customer_total_minor integer,
  ADD COLUMN tax_status text,
  ADD COLUMN tax_policy text,
  ADD COLUMN tax_display text,
  ADD CONSTRAINT delivery_dna_overview_payment_event_totals CHECK (
    (subtotal_minor IS NULL OR subtotal_minor >= 0)
    AND (vat_amount_minor IS NULL OR vat_amount_minor >= 0)
    AND (customer_total_minor IS NULL OR customer_total_minor >= 0)
  ) NOT VALID;

ALTER TABLE public.delivery_dna_overview_access_grants
  ADD COLUMN subtotal_minor integer,
  ADD COLUMN vat_amount_minor integer,
  ADD COLUMN customer_total_minor integer,
  ADD COLUMN tax_status text,
  ADD COLUMN tax_policy text,
  ADD COLUMN tax_display text,
  ADD CONSTRAINT delivery_dna_overview_access_grant_tax_evidence CHECK (
    (
      subtotal_minor IS NULL AND vat_amount_minor IS NULL AND customer_total_minor IS NULL
      AND tax_status IS NULL AND tax_policy IS NULL AND tax_display IS NULL
    ) OR (
      subtotal_minor IS NOT NULL AND vat_amount_minor IS NOT NULL
      AND customer_total_minor IS NOT NULL AND tax_status IS NOT NULL
      AND tax_policy IS NOT NULL AND tax_display IS NOT NULL
      AND subtotal_minor > 0 AND vat_amount_minor >= 0
      AND customer_total_minor = subtotal_minor + vat_amount_minor
      AND amount_minor = subtotal_minor
      AND length(trim(tax_status)) > 0
      AND length(trim(tax_policy)) > 0
      AND length(trim(tax_display)) > 0
    )
  ) NOT VALID,
  ADD CONSTRAINT delivery_dna_overview_access_grant_offer_1_0_1 CHECK (
    offer_version <> '1.0.1' OR (
      subtotal_minor = 29500 AND vat_amount_minor = 0 AND customer_total_minor = 29500
      AND currency = 'GBP' AND tax_status = 'supplier_not_vat_registered'
      AND tax_policy = 'no_vat_charged_supplier_not_vat_registered'
      AND tax_display = 'No VAT charged — DeliveryIQ is not VAT registered.'
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.create_delivery_dna_overview_checkout_v2(
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
  p_unit_amount_minor integer,
  p_subtotal_minor integer,
  p_vat_amount_minor integer,
  p_customer_total_minor integer,
  p_currency text,
  p_tax_status text,
  p_tax_policy text,
  p_tax_display text,
  p_provider text,
  p_provider_price_reference text,
  p_idempotency_scope_key text,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_checkout_id uuid;
BEGIN
  IF p_unit_amount_minor IS NULL OR p_subtotal_minor IS NULL
     OR p_vat_amount_minor IS NULL OR p_customer_total_minor IS NULL
     OR p_tax_status IS NULL OR p_tax_policy IS NULL OR p_tax_display IS NULL
     OR p_unit_amount_minor <= 0
     OR p_subtotal_minor IS DISTINCT FROM p_unit_amount_minor
     OR p_vat_amount_minor < 0
     OR p_customer_total_minor IS DISTINCT FROM p_subtotal_minor + p_vat_amount_minor
     OR length(trim(p_tax_status)) = 0
     OR length(trim(p_tax_policy)) = 0
     OR length(trim(p_tax_display)) = 0 THEN
    RAISE EXCEPTION 'OVERVIEW_CHECKOUT_TAX_INVALID';
  END IF;

  v_checkout_id := public.create_delivery_dna_overview_checkout(
    p_purchaser_user_id, p_organisation_id, p_workspace_id, p_saved_snapshot_id,
    p_assessment_session_id, p_offer_id, p_offer_version, p_product_id,
    p_product_version, p_access_key, p_access_version, p_unit_amount_minor,
    p_currency, p_provider, p_provider_price_reference, p_idempotency_scope_key,
    p_expires_at
  );

  UPDATE public.delivery_dna_overview_checkouts
  SET subtotal_minor = p_subtotal_minor,
      vat_amount_minor = p_vat_amount_minor,
      customer_total_minor = p_customer_total_minor,
      tax_status = trim(p_tax_status),
      tax_policy = trim(p_tax_policy),
      tax_display = trim(p_tax_display)
  WHERE id = v_checkout_id
    AND offer_id = p_offer_id
    AND offer_version = p_offer_version
    AND amount_minor = p_unit_amount_minor
    AND currency = upper(p_currency)
    AND (
      (subtotal_minor IS NULL AND vat_amount_minor IS NULL AND customer_total_minor IS NULL
        AND tax_status IS NULL AND tax_policy IS NULL AND tax_display IS NULL)
      OR (subtotal_minor = p_subtotal_minor AND vat_amount_minor = p_vat_amount_minor
        AND customer_total_minor = p_customer_total_minor
        AND tax_status = trim(p_tax_status) AND tax_policy = trim(p_tax_policy)
        AND tax_display = trim(p_tax_display))
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'OVERVIEW_CHECKOUT_TAX_INVALID'; END IF;
  RETURN v_checkout_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfil_delivery_dna_overview_payment_v2(
  p_provider text,
  p_provider_event_id text,
  p_provider_checkout_id text,
  p_event_type text,
  p_payment_status text,
  p_subtotal_minor integer,
  p_vat_amount_minor integer,
  p_customer_total_minor integer,
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
      payment_status, amount_minor, subtotal_minor, vat_amount_minor,
      customer_total_minor, currency, payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, NULL, p_event_type,
      p_payment_status, p_subtotal_minor, p_subtotal_minor, p_vat_amount_minor,
      p_customer_total_minor, upper(p_currency), p_payload_digest,
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
      payment_status, amount_minor, subtotal_minor, vat_amount_minor,
      customer_total_minor, currency, tax_status, tax_policy, tax_display,
      payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
      p_payment_status, p_subtotal_minor, p_subtotal_minor, p_vat_amount_minor,
      p_customer_total_minor, upper(p_currency), v_checkout.tax_status,
      v_checkout.tax_policy, v_checkout.tax_display, p_payload_digest,
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
     OR v_checkout.subtotal_minor IS DISTINCT FROM p_subtotal_minor
     OR v_checkout.vat_amount_minor IS DISTINCT FROM p_vat_amount_minor
     OR v_checkout.customer_total_minor IS DISTINCT FROM p_customer_total_minor
     OR p_customer_total_minor IS DISTINCT FROM p_subtotal_minor + p_vat_amount_minor
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
      payment_status, amount_minor, subtotal_minor, vat_amount_minor,
      customer_total_minor, currency, tax_status, tax_policy, tax_display,
      payload_digest, verification_status, safe_status
    ) VALUES (
      p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
      p_payment_status, p_subtotal_minor, p_subtotal_minor, p_vat_amount_minor,
      p_customer_total_minor, upper(p_currency), v_checkout.tax_status,
      v_checkout.tax_policy, v_checkout.tax_display, p_payload_digest,
      'rejected', 'payment_verification_failed'
    ) RETURNING id INTO v_event_id;
    UPDATE public.delivery_dna_overview_checkouts
      SET status = 'verification_failed', safe_status = 'payment_verification_failed'
      WHERE id = v_checkout.id AND status <> 'succeeded';
    RETURN jsonb_build_object('eventId', v_event_id, 'grantId', NULL, 'status', 'payment_verification_failed', 'replayed', false);
  END IF;

  INSERT INTO public.delivery_dna_overview_payment_events (
    provider, provider_event_id, provider_checkout_id, checkout_id, event_type,
    payment_status, amount_minor, subtotal_minor, vat_amount_minor,
    customer_total_minor, currency, tax_status, tax_policy, tax_display,
    payload_digest, verification_status, safe_status
  ) VALUES (
    p_provider, p_provider_event_id, p_provider_checkout_id, v_checkout.id, p_event_type,
    p_payment_status, p_subtotal_minor, p_subtotal_minor, p_vat_amount_minor,
    p_customer_total_minor, upper(p_currency), v_checkout.tax_status,
    v_checkout.tax_policy, v_checkout.tax_display, p_payload_digest,
    'accepted', 'payment_confirmed'
  ) RETURNING id INTO v_event_id;

  INSERT INTO public.delivery_dna_overview_access_grants (
    purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id,
    assessment_session_id, checkout_id, payment_event_id, offer_id, offer_version,
    product_id, product_version, access_key, access_version, amount_minor,
    subtotal_minor, vat_amount_minor, customer_total_minor, currency,
    tax_status, tax_policy, tax_display
  ) VALUES (
    v_checkout.purchaser_user_id, v_checkout.organisation_id, v_checkout.workspace_id,
    v_checkout.saved_snapshot_id, v_checkout.assessment_session_id, v_checkout.id,
    v_event_id, v_checkout.offer_id, v_checkout.offer_version, v_checkout.product_id,
    v_checkout.product_version, v_checkout.access_key, v_checkout.access_version,
    v_checkout.amount_minor, v_checkout.subtotal_minor, v_checkout.vat_amount_minor,
    v_checkout.customer_total_minor, v_checkout.currency, v_checkout.tax_status,
    v_checkout.tax_policy, v_checkout.tax_display
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

REVOKE ALL ON FUNCTION public.create_delivery_dna_overview_checkout_v2(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, integer, integer, integer, text, text, text, text, text, text, text, timestamptz
), public.fulfil_delivery_dna_overview_payment_v2(
  text, text, text, text, text, integer, integer, integer, text, text,
  uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_delivery_dna_overview_checkout_v2(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, integer, integer, integer, text, text, text, text, text, text, text, timestamptz
), public.fulfil_delivery_dna_overview_payment_v2(
  text, text, text, text, text, integer, integer, integer, text, text,
  uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text
) TO service_role;

COMMENT ON COLUMN public.delivery_dna_overview_checkouts.tax_display IS
  'Version-pinned customer tax disclosure captured when Checkout is created.';
COMMENT ON COLUMN public.delivery_dna_overview_payment_events.vat_amount_minor IS
  'Provider-reported tax amount retained immutably with the verified event.';
