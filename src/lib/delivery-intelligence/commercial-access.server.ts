/* eslint-disable @typescript-eslint/no-explicit-any -- pending governed migration fields */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { IdentityError } from "@/lib/identity/errors";

import {
  DELIVERY_DNA_COMMERCIAL_POLICY,
  evaluateDeliveryDnaCommercialAccess,
  type DeliveryDnaAvailabilityRecord,
  type DeliveryDnaCommercialAccessDecision,
  type DeliveryDnaEntitlementRecord,
} from "./commercial-access";

const database = supabaseAdmin as unknown as { from(table: string): any };

function availabilityRecord(
  row: Record<string, unknown> | null,
): DeliveryDnaAvailabilityRecord | null {
  return row
    ? {
        productType: String(row.product_type),
        productId: String(row.product_id),
        productVersion: typeof row.product_version === "string" ? row.product_version : null,
        status: String(row.status),
      }
    : null;
}

function entitlementRecord(
  row: Record<string, unknown> | null,
): DeliveryDnaEntitlementRecord | null {
  return row
    ? {
        organisationId: String(row.organisation_id),
        workspaceId: typeof row.workspace_id === "string" ? row.workspace_id : null,
        productType: String(row.product_type),
        productId: String(row.product_id),
        productVersion: typeof row.product_version === "string" ? row.product_version : null,
        entitled: row.entitled === true,
        validFrom: typeof row.valid_from === "string" ? row.valid_from : null,
        expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
        revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
      }
    : null;
}

export async function resolveDeliveryDnaCommercialAccess(input: {
  organisationId: string;
  workspaceId: string;
  permitted: boolean;
}): Promise<DeliveryDnaCommercialAccessDecision> {
  const policy = DELIVERY_DNA_COMMERCIAL_POLICY;
  const [availability, entitlement] = await Promise.all([
    database
      .from("delivery_product_availability")
      .select("product_type,product_id,product_version,status")
      .eq("product_type", policy.productType)
      .eq("product_id", policy.productId)
      .maybeSingle(),
    database
      .from("organisation_product_entitlements")
      .select(
        "organisation_id,workspace_id,product_type,product_id,product_version,entitled,valid_from,expires_at,revoked_at",
      )
      .eq("organisation_id", input.organisationId)
      .eq("product_type", policy.productType)
      .eq("product_id", policy.productId)
      .maybeSingle(),
  ]);
  if (availability.error || entitlement.error) {
    throw new IdentityError("delivery_dna_action_unavailable", policy.panel.unavailable, 503);
  }
  return evaluateDeliveryDnaCommercialAccess({
    ...input,
    availability: availabilityRecord(availability.data),
    entitlement: entitlementRecord(entitlement.data),
    commercialContactRoute: process.env.DELIVERYIQ_COMMERCIAL_CONTACT_ROUTE,
  });
}

export async function assertDeliveryDnaActionAccess(input: {
  organisationId: string;
  workspaceId: string;
  permitted: boolean;
}): Promise<DeliveryDnaCommercialAccessDecision> {
  const decision = await resolveDeliveryDnaCommercialAccess(input);
  if (decision.accessTier === "entitled") return decision;
  throw new IdentityError(
    decision.state === "unavailable"
      ? "delivery_dna_action_unavailable"
      : "delivery_dna_action_required",
    decision.state === "unavailable"
      ? DELIVERY_DNA_COMMERCIAL_POLICY.panel.unavailable
      : DELIVERY_DNA_COMMERCIAL_POLICY.panel.body,
    403,
  );
}
