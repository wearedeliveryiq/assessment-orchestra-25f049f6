/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads and governed RPCs are validated at this boundary */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assessmentRequestContext } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

import { resolveDeliveryDnaOverviewAccess } from "./overview-access.server";
import { activeDeliveryDnaOverviewOffer, deliveryDnaOverviewOffer } from "./overview-offer";

const db = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, input: any): any;
};

type PaymentConfiguration = {
  provider: "stripe";
  secretKey: string;
  webhookSecret: string;
  priceReference: string;
};

type CheckoutScope = {
  id: string;
  linked_user_id: string;
  organisation_id: string;
  workspace_id: string;
  assessment_session_id: string;
  configuration_version: string;
};

type CheckoutRow = {
  id: string;
  status: string;
  provider_checkout_id: string | null;
  provider_checkout_url: string | null;
};

export class OverviewPaymentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function paymentConfiguration(): PaymentConfiguration | null {
  if (process.env.DELIVERYIQ_PAYMENT_PROVIDER !== "stripe") return null;
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const priceReference = process.env.DELIVERYIQ_OVERVIEW_STRIPE_PRICE_ID?.trim() ?? "";
  return secretKey && webhookSecret && priceReference
    ? { provider: "stripe", secretKey, webhookSecret, priceReference }
    : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  if (!/^https?:$/.test(url.protocol))
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable.",
      503,
    );
  return url.origin;
}

async function scopeFor(assessmentId: string): Promise<CheckoutScope | null> {
  const { data, error } = await db
    .from("delivery_dna_snapshot_sessions")
    .select(
      "id,linked_user_id,organisation_id,workspace_id,assessment_session_id,configuration_version",
    )
    .eq("assessment_session_id", assessmentId)
    .eq("status", "linked")
    .eq("configuration_version", "2.0.0")
    .maybeSingle();
  if (error)
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable.",
      503,
    );
  return data as CheckoutScope | null;
}

async function stripeCheckout(input: {
  configuration: PaymentConfiguration;
  checkoutId: string;
  customerEmail: string;
  origin: string;
  scope: CheckoutScope;
}): Promise<{ id: string; url: string }> {
  const params = deliveryDnaOverviewStripeCheckoutParameters(input);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.configuration.secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": input.checkoutId,
    },
    body: params,
  });
  const body = (await response.json().catch(() => null)) as { id?: unknown; url?: unknown } | null;
  if (
    !response.ok ||
    typeof body?.id !== "string" ||
    typeof body.url !== "string" ||
    !body.url.startsWith("https://")
  ) {
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable.",
      503,
    );
  }
  return { id: body.id, url: body.url };
}

export function deliveryDnaOverviewStripeCheckoutParameters(input: {
  configuration: Pick<PaymentConfiguration, "priceReference">;
  checkoutId: string;
  customerEmail: string;
  origin: string;
  scope: CheckoutScope;
}): URLSearchParams {
  const offer = deliveryDnaOverviewOffer;
  return new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": input.configuration.priceReference,
    "line_items[0][quantity]": "1",
    customer_email: input.customerEmail,
    client_reference_id: input.checkoutId,
    success_url: `${input.origin}/snapshot?continue=1&checkout=success`,
    cancel_url: `${input.origin}/snapshot?continue=1&checkout=cancelled`,
    "automatic_tax[enabled]": "false",
    "tax_id_collection[enabled]": "false",
    "custom_text[submit][message]": offer.taxDisplay,
    "custom_text[after_submit][message]": offer.taxDisplay,
    "payment_intent_data[description]": offer.taxDisplay,
    "metadata[checkout_id]": input.checkoutId,
    "metadata[purchaser_user_id]": input.scope.linked_user_id,
    "metadata[organisation_id]": input.scope.organisation_id,
    "metadata[workspace_id]": input.scope.workspace_id,
    "metadata[saved_snapshot_id]": input.scope.id,
    "metadata[assessment_session_id]": input.scope.assessment_session_id,
    "metadata[offer_id]": offer.offerId,
    "metadata[offer_version]": offer.offerVersion,
    "metadata[access_key]": offer.accessKey,
    "metadata[access_version]": offer.accessVersion,
  });
}

export async function createDeliveryDnaOverviewCheckout(request: Request, assessmentId: string) {
  const context = await assessmentRequestContext(request, { write: true });
  if (!context.identity.user.emailVerified)
    throw new IdentityError("email_not_verified", "Verify your email before purchasing.", 403);
  const access = await resolveDeliveryDnaOverviewAccess({ assessmentId, context });
  if (!access)
    throw new IdentityError("overview_not_found", "The Saved Snapshot is not available.", 404);
  if (access.permitted)
    return { status: "already_available", destination: `/assessment/${assessmentId}` };
  const configuration = paymentConfiguration();
  const offer = activeDeliveryDnaOverviewOffer();
  if (!configuration || !offer) {
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable. Your Saved Snapshot is safe.",
      503,
    );
  }
  const scope = await scopeFor(assessmentId);
  if (
    !scope ||
    scope.linked_user_id !== context.identity.user.id ||
    scope.organisation_id !== context.organisationId ||
    scope.workspace_id !== context.workspaceId
  ) {
    throw new IdentityError("overview_not_found", "The Saved Snapshot is not available.", 404);
  }

  const idempotencyScopeKey = sha256(
    [
      scope.linked_user_id,
      scope.organisation_id,
      scope.workspace_id,
      scope.id,
      scope.assessment_session_id,
      offer.offerId,
      offer.offerVersion,
    ].join(":"),
  );
  const { data: checkoutId, error: createError } = await db.rpc(
    "create_delivery_dna_overview_checkout_v2",
    {
      p_purchaser_user_id: scope.linked_user_id,
      p_organisation_id: scope.organisation_id,
      p_workspace_id: scope.workspace_id,
      p_saved_snapshot_id: scope.id,
      p_assessment_session_id: scope.assessment_session_id,
      p_offer_id: offer.offerId,
      p_offer_version: offer.offerVersion,
      p_product_id: offer.productId,
      p_product_version: offer.productVersion,
      p_access_key: offer.accessKey,
      p_access_version: offer.accessVersion,
      p_unit_amount_minor: offer.unitAmountMinor,
      p_subtotal_minor: offer.unitAmountMinor,
      p_vat_amount_minor: offer.vatAmountMinor,
      p_customer_total_minor: offer.customerTotalMinor,
      p_currency: offer.currency,
      p_tax_status: offer.taxStatus,
      p_tax_policy: offer.taxPolicy,
      p_tax_display: offer.taxDisplay,
      p_provider: configuration.provider,
      p_provider_price_reference: configuration.priceReference,
      p_idempotency_scope_key: idempotencyScopeKey,
      p_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  );
  if (createError || typeof checkoutId !== "string")
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable.",
      503,
    );
  const { data: stored, error: readError } = await db
    .from("delivery_dna_overview_checkouts")
    .select("id,status,provider_checkout_id,provider_checkout_url")
    .eq("id", checkoutId)
    .single();
  if (readError)
    throw new OverviewPaymentError(
      "CHECKOUT_UNAVAILABLE",
      "Purchases are temporarily unavailable.",
      503,
    );
  const existing = stored as CheckoutRow;
  if (existing.status === "succeeded")
    return { status: "already_available", destination: `/assessment/${assessmentId}` };
  if (existing.status === "awaiting_payment" && existing.provider_checkout_url) {
    return { status: "checkout_ready", checkoutUrl: existing.provider_checkout_url };
  }

  try {
    const created = await stripeCheckout({
      configuration,
      checkoutId,
      customerEmail: context.identity.user.email,
      origin: publicOrigin(request),
      scope,
    });
    const attached = await db.rpc("attach_delivery_dna_overview_provider_checkout", {
      p_checkout_id: checkoutId,
      p_provider_checkout_id: created.id,
      p_provider_checkout_url: created.url,
    });
    if (attached.error)
      throw new OverviewPaymentError(
        "CHECKOUT_UNAVAILABLE",
        "Purchases are temporarily unavailable.",
        503,
      );
    return { status: "checkout_ready", checkoutUrl: created.url };
  } catch (error) {
    await db.rpc("fail_delivery_dna_overview_checkout", {
      p_checkout_id: checkoutId,
      p_safe_status: "checkout_unavailable",
    });
    throw error instanceof OverviewPaymentError
      ? error
      : new OverviewPaymentError(
          "CHECKOUT_UNAVAILABLE",
          "Purchases are temporarily unavailable.",
          503,
        );
  }
}

function parseStripeSignature(header: string): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = Number(parts.find(([name]) => name === "t")?.[1]);
  const signatures = parts.filter(([name]) => name === "v1").map(([, value]) => value);
  return Number.isInteger(timestamp) && signatures.length ? { timestamp, signatures } : null;
}

export function verifyStripeWebhook(
  body: string,
  header: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parsed = parseStripeSignature(header);
  if (!parsed || Math.abs(now / 1000 - parsed.timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parsed.timestamp}.${body}`).digest("hex");
  return parsed.signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/.test(signature)) return false;
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  });
}

function stringMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function stripeCheckoutTotals(value: unknown): {
  subtotalMinor: number | null;
  vatAmountMinor: number | null;
  customerTotalMinor: number | null;
} {
  const session = value as {
    amount_subtotal?: unknown;
    amount_total?: unknown;
    total_details?: { amount_tax?: unknown } | null;
  } | null;
  return {
    subtotalMinor: Number.isInteger(session?.amount_subtotal)
      ? (session?.amount_subtotal as number)
      : null,
    vatAmountMinor: Number.isInteger(session?.total_details?.amount_tax)
      ? (session?.total_details?.amount_tax as number)
      : null,
    customerTotalMinor: Number.isInteger(session?.amount_total)
      ? (session?.amount_total as number)
      : null,
  };
}

export async function handleDeliveryDnaOverviewWebhook(request: Request): Promise<Response> {
  const configuration = paymentConfiguration();
  if (!configuration) return new Response("Unavailable", { status: 503 });
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!verifyStripeWebhook(body, signature, configuration.webhookSecret))
    return new Response("Invalid signature", { status: 400 });
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid event", { status: 400 });
  }
  if (typeof event?.id !== "string" || typeof event?.type !== "string")
    return new Response("Invalid event", { status: 400 });
  const supported = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ]);
  if (!supported.has(event.type))
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const session = event?.data?.object;
  const metadata = stringMetadata(session?.metadata);
  if (
    metadata.offer_id !== deliveryDnaOverviewOffer.offerId ||
    metadata.offer_version !== deliveryDnaOverviewOffer.offerVersion ||
    metadata.access_version !== deliveryDnaOverviewOffer.accessVersion
  ) {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  const totals = stripeCheckoutTotals(session);
  const paymentStatus =
    (event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded") &&
    session?.payment_status === "paid"
      ? "succeeded"
      : event.type === "checkout.session.expired"
        ? "cancelled"
        : "failed";
  const shared = {
    p_provider: configuration.provider,
    p_provider_event_id: event.id,
    p_provider_checkout_id: typeof session?.id === "string" ? session.id : "",
    p_event_type: event.type,
    p_payment_status: paymentStatus,
    p_currency: typeof session?.currency === "string" ? session.currency.toUpperCase() : "",
    p_payload_digest: sha256(body),
    p_checkout_id: metadata.checkout_id ?? "00000000-0000-0000-0000-000000000000",
    p_purchaser_user_id: metadata.purchaser_user_id ?? "00000000-0000-0000-0000-000000000000",
    p_organisation_id: metadata.organisation_id ?? "00000000-0000-0000-0000-000000000000",
    p_workspace_id: metadata.workspace_id ?? "00000000-0000-0000-0000-000000000000",
    p_saved_snapshot_id: metadata.saved_snapshot_id ?? "00000000-0000-0000-0000-000000000000",
    p_assessment_session_id:
      metadata.assessment_session_id ?? "00000000-0000-0000-0000-000000000000",
    p_offer_id: metadata.offer_id ?? "",
    p_offer_version: metadata.offer_version ?? "",
    p_access_key: metadata.access_key ?? "",
    p_access_version: metadata.access_version ?? "",
  };
  const result = await db.rpc("fulfil_delivery_dna_overview_payment_v2", {
    ...shared,
    p_subtotal_minor: totals.subtotalMinor,
    p_vat_amount_minor: totals.vatAmountMinor,
    p_customer_total_minor: totals.customerTotalMinor,
  });
  if (result.error) {
    console.error("[overview-payment] verified event processing failed", { eventId: event.id });
    return new Response("Temporary failure", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export function handleOverviewPaymentError(error: unknown): Response {
  if (error instanceof OverviewPaymentError || error instanceof IdentityError) {
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: error.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    });
  }
  console.error("[overview-payment] request failed");
  return new Response(
    JSON.stringify({
      error: "Purchases are temporarily unavailable.",
      code: "CHECKOUT_UNAVAILABLE",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
}
