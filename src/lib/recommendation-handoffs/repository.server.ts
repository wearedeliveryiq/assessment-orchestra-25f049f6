/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { ProductOperationalState } from "./model";
import type { ProductHandoffRecord, ProductHandoffRepository, ProductHandoffSource } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function handoff(row: Record<string, any>): ProductHandoffRecord {
  const events = row.recommendation_product_handoff_events ?? [];
  const consumed = (Array.isArray(events) ? events : [events]).find(
    (event) => event?.event_type === "consumed",
  );
  return {
    id: row.id,
    sourceActionId: row.source_action_id,
    sourcePortfolioItemId: row.source_portfolio_item_id,
    analysisRunId: row.analysis_run_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetVersion: row.target_version,
    cta: row.cta,
    consentBasis: row.consent_basis,
    consentedAt: row.consented_at,
    createdByUserId: row.created_by_user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    consumedAt: consumed?.occurred_at ?? null,
  };
}

const handoffSelection = "*,recommendation_product_handoff_events(event_type,occurred_at)";

export async function getSource(
  actionId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<ProductHandoffSource | null> {
  const actionResult = await database
    .from("recommendation_improvement_actions")
    .select(
      "id,portfolio_item_id,analysis_run_id,recommendation_id,recommendation_version,status,organisation_id,workspace_id",
    )
    .eq("id", actionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (actionResult.error) throw new Error(actionResult.error.message);
  if (!actionResult.data) return null;
  const decisionResult = await database
    .from("recommendation_item_decisions")
    .select("current_state")
    .eq("portfolio_item_id", actionResult.data.portfolio_item_id)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (decisionResult.error) throw new Error(decisionResult.error.message);
  return {
    actionId: actionResult.data.id,
    portfolioItemId: actionResult.data.portfolio_item_id,
    analysisRunId: actionResult.data.analysis_run_id,
    recommendationId: actionResult.data.recommendation_id,
    recommendationVersion: actionResult.data.recommendation_version,
    actionStatus: actionResult.data.status,
    decisionState: decisionResult.data?.current_state ?? "undecided",
    organisationId: actionResult.data.organisation_id,
    workspaceId: actionResult.data.workspace_id,
  };
}

export async function getOperationalStates(
  organisationId: string,
): Promise<ProductOperationalState[]> {
  const [availability, entitlements, activations] = await Promise.all([
    database
      .from("delivery_product_availability")
      .select("product_type,product_id,product_version,status"),
    database
      .from("organisation_product_entitlements")
      .select("product_type,product_id,entitled")
      .eq("organisation_id", organisationId),
    database
      .from("organisation_product_activations")
      .select("product_type,product_id,product_version,status")
      .eq("organisation_id", organisationId),
  ]);
  if (availability.error || entitlements.error || activations.error) {
    throw new Error(
      availability.error?.message ?? entitlements.error?.message ?? activations.error?.message,
    );
  }
  const entitlement = new Map(
    (entitlements.data ?? []).map((row: Record<string, any>) => [
      `${row.product_type}:${row.product_id}`,
      row.entitled === true,
    ]),
  );
  const activated = new Set(
    (activations.data ?? [])
      .filter((row: Record<string, any>) => row.status === "active")
      .map(
        (row: Record<string, any>) =>
          `${row.product_type}:${row.product_id}:${row.product_version}`,
      ),
  );
  return (availability.data ?? []).map((row: Record<string, any>) => ({
    targetType: row.product_type,
    targetId: row.product_id,
    targetVersion: row.product_version,
    status: row.status,
    entitled: entitlement.get(`${row.product_type}:${row.product_id}`) === true,
    activated: activated.has(`${row.product_type}:${row.product_id}:${row.product_version}`),
  }));
}

export async function getHandoffByIdempotency(
  idempotencyKey: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_product_handoffs")
    .select(handoffSelection)
    .eq("idempotency_key", idempotencyKey)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? { ...handoff(result.data), requestHash: result.data.request_hash } : null;
}

async function getHandoffById(id: string, tenant: { organisationId: string; workspaceId: string }) {
  const result = await database
    .from("recommendation_product_handoffs")
    .select(handoffSelection)
    .eq("id", id)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? handoff(result.data) : null;
}

export async function getHandoffByTokenHash(
  tokenHash: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_product_handoffs")
    .select(handoffSelection)
    .eq("token_hash", tokenHash)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? handoff(result.data) : null;
}

export async function createHandoff(input: Record<string, unknown>) {
  const result = await database.rpc("create_recommendation_product_handoff", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("PRODUCT_HANDOFF_INVALID: no hand-off returned");
  return (
    (await getHandoffById(String(row.id), {
      organisationId: String(row.organisation_id),
      workspaceId: String(row.workspace_id),
    })) ?? handoff(row)
  );
}

export async function consumeHandoff(input: Record<string, unknown>) {
  const result = await database.rpc("consume_recommendation_product_handoff", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("PRODUCT_HANDOFF_INVALID: no hand-off returned");
  return (
    (await getHandoffById(String(row.id), {
      organisationId: String(row.organisation_id),
      workspaceId: String(row.workspace_id),
    })) ?? handoff(row)
  );
}

export const productHandoffRepository: ProductHandoffRepository = {
  getSource,
  getOperationalStates,
  getHandoffByIdempotency,
  getHandoffByTokenHash,
  createHandoff,
  consumeHandoff,
};
