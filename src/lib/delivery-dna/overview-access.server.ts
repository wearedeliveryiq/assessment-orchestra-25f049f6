/* eslint-disable @typescript-eslint/no-explicit-any -- governed service-role tables are generated after deployment */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssessmentRequestContext } from "@/lib/identity/assessment-auth.server";

import {
  activeDeliveryDnaOverviewOffer,
  deliveryDnaCommercialCopy,
  deliveryDnaOverviewOffer,
} from "./overview-offer";

const db = supabaseAdmin as unknown as { from(table: string): any };

export interface DeliveryDnaOverviewAccess {
  assessmentId: string;
  savedSnapshotId: string;
  access: "paid" | "grandfathered" | "none";
  permitted: boolean;
  offer: {
    offerId: string;
    offerVersion: string;
    displayPrice: string;
    taxDisplay: string;
    purchaseAction: string;
    checkoutAvailable: boolean;
  } | null;
  safeStatus: "available" | "checkout_unavailable" | "payment_confirmation_pending" | null;
}

type ScopeRow = {
  id: string;
  linked_at: string;
  linked_user_id: string;
  organisation_id: string;
  workspace_id: string;
  assessment_session_id: string;
  configuration_version: string;
};

function checkoutConfigured(): boolean {
  return Boolean(
    process.env.DELIVERYIQ_PAYMENT_PROVIDER === "stripe" &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.DELIVERYIQ_OVERVIEW_STRIPE_PRICE_ID,
  );
}

async function scopeForAssessment(assessmentId: string): Promise<ScopeRow | null> {
  const { data, error } = await db
    .from("delivery_dna_snapshot_sessions")
    .select(
      "id,linked_at,linked_user_id,organisation_id,workspace_id,assessment_session_id,configuration_version",
    )
    .eq("assessment_session_id", assessmentId)
    .eq("status", "linked")
    .maybeSingle();
  if (error) throw new Error("OVERVIEW_ACCESS_UNAVAILABLE");
  return data as ScopeRow | null;
}

async function paidGrantExists(scope: ScopeRow): Promise<boolean> {
  const { data, error } = await db
    .from("delivery_dna_overview_access_grants")
    .select("id")
    .eq("purchaser_user_id", scope.linked_user_id)
    .eq("organisation_id", scope.organisation_id)
    .eq("workspace_id", scope.workspace_id)
    .eq("saved_snapshot_id", scope.id)
    .eq("assessment_session_id", scope.assessment_session_id)
    .eq("access_key", deliveryDnaOverviewOffer.accessKey)
    .eq("access_version", deliveryDnaOverviewOffer.accessVersion)
    .maybeSingle();
  if (error) throw new Error("OVERVIEW_ACCESS_UNAVAILABLE");
  return Boolean(data);
}

function matchesContext(scope: ScopeRow, context: AssessmentRequestContext): boolean {
  return (
    scope.linked_user_id === context.identity.user.id &&
    scope.organisation_id === context.organisationId &&
    scope.workspace_id === context.workspaceId
  );
}

export async function resolveDeliveryDnaOverviewAccess(input: {
  assessmentId: string;
  context: AssessmentRequestContext;
}): Promise<DeliveryDnaOverviewAccess | null> {
  const scope = await scopeForAssessment(input.assessmentId);
  if (!scope || !matchesContext(scope, input.context)) return null;
  const grandfathered = scope.configuration_version.startsWith("1.");
  const current = scope.configuration_version === "2.1.0";
  const paid = current ? await paidGrantExists(scope) : false;
  const access = grandfathered ? "grandfathered" : paid ? "paid" : "none";
  const offer = activeDeliveryDnaOverviewOffer();
  return {
    assessmentId: scope.assessment_session_id,
    savedSnapshotId: scope.id,
    access,
    permitted: access !== "none",
    offer:
      offer && current
        ? {
            offerId: offer.offerId,
            offerVersion: offer.offerVersion,
            displayPrice: offer.displayPrice,
            taxDisplay: offer.taxDisplay,
            purchaseAction: deliveryDnaCommercialCopy.overviewOffer.purchaseAction,
            checkoutAvailable: checkoutConfigured(),
          }
        : null,
    safeStatus:
      access !== "none"
        ? "available"
        : current && checkoutConfigured()
          ? null
          : "checkout_unavailable",
  };
}

async function isHistoricalReadOnlyResult(assessmentId: string, ownerKey: string) {
  const { data, error } = await db
    .from("assessment_sessions")
    .select("owner_key,status")
    .eq("id", assessmentId)
    .maybeSingle();
  return Boolean(
    !error &&
    data?.owner_key === ownerKey &&
    ["completed", "archived"].includes(String(data.status)),
  );
}

/**
 * Clean 2.1 runtime guard. Historical completed results remain readable, but
 * no 1.x or 2.0 draft can continue or complete after cutover.
 */
export async function canUseDeliveryDnaAssessment(
  assessmentId: string,
  ownerKey: string,
): Promise<boolean> {
  const scope = await scopeForAssessment(assessmentId);
  if (!scope) {
    const { data, error } = await db
      .from("assessment_sessions")
      .select("owner_key,metadata,status")
      .eq("id", assessmentId)
      .maybeSingle();
    if (error || !data || data.owner_key !== ownerKey) return false;
    const version = (data.metadata as { deliveryDna?: { questionSetVersion?: unknown } } | null)
      ?.deliveryDna?.questionSetVersion;
    return version !== "2.1.0" && ["completed", "archived"].includes(String(data.status));
  }
  const [userId, workspaceId] = ownerKey.split(":");
  if (scope.linked_user_id !== userId || scope.workspace_id !== workspaceId) return false;
  if (scope.configuration_version !== "2.1.0") {
    return isHistoricalReadOnlyResult(assessmentId, ownerKey);
  }
  return paidGrantExists(scope);
}
