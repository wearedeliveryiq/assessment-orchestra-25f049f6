/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  RecommendationAnalyticsAggregate,
  RecommendationAnalyticsConsent,
  RecommendationAnalyticsEvent,
  RecommendationAnalyticsConsentStatus,
} from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function consent(row: Record<string, any>): RecommendationAnalyticsConsent {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    userId: row.user_id,
    status: row.status,
    version: Number(row.consent_version),
    occurredAt: row.occurred_at,
  };
}

function event(row: Record<string, any>): RecommendationAnalyticsEvent {
  return {
    eventId: row.event_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    actorPseudonym: row.actor_pseudonym,
    eventType: row.event_type,
    objectType: row.object_type,
    objectId: row.object_id,
    objectVersion: row.object_version,
    mode: row.mode,
    properties: row.properties ?? {},
    occurredAt: row.occurred_at,
    schemaVersion: row.schema_version,
  };
}

export async function getConsent(organisationId: string, userId: string) {
  const result = await database
    .from("recommendation_analytics_consent_events")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .order("consent_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? consent(result.data) : null;
}

export async function setConsent(input: {
  organisationId: string;
  workspaceId: string;
  userId: string;
  status: RecommendationAnalyticsConsentStatus;
  idempotencyKey: string;
  requestHash: string;
}) {
  const result = await database.rpc("set_recommendation_analytics_consent", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_ANALYTICS_CONSENT_INVALID");
  return consent(row);
}

export async function sourceExists(input: {
  objectType: string;
  objectId: string;
  organisationId: string;
  workspaceId: string;
}) {
  const tables: Record<string, string> = {
    portfolio: "recommendation_portfolios",
    portfolio_item: "recommendation_portfolio_items",
    decision: "recommendation_item_decisions",
    action: "recommendation_improvement_actions",
    handoff: "recommendation_product_handoffs",
  };
  const table = tables[input.objectType];
  // S4-010 does not yet provide a governed outcome source. Keep the approved
  // event contract available, but fail closed until an outcome can be scoped
  // to an immutable tenant-owned record.
  if (!table) return false;
  const result = await database
    .from(table)
    .select("id")
    .eq("id", input.objectId)
    .eq("organisation_id", input.organisationId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}

export async function capture(input: Record<string, unknown>) {
  const result = await database.rpc("capture_recommendation_analytics_event", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_ANALYTICS_INVALID");
  return event(row);
}

export async function aggregate(from: string, to: string) {
  const result = await database.rpc("recommendation_analytics_product_aggregate", {
    p_from: from,
    p_to: to,
  });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row: Record<string, any>): RecommendationAnalyticsAggregate => ({
    eventType: row.event_type,
    mode: row.mode,
    properties: row.properties ?? {},
    tenantCount: Number(row.tenant_count),
    eventCount: Number(row.event_count),
  }));
}

export async function applyAnalyticsRetention(input: {
  organisationId: string | null;
  mode: "archive" | "purge";
  cutoff: string;
  limit?: number;
}) {
  const result = await database.rpc("apply_recommendation_analytics_retention", {
    p_organisation_id: input.organisationId,
    p_mode: input.mode,
    p_cutoff: input.cutoff,
    p_limit: input.limit ?? 5_000,
  });
  if (result.error) throw new Error(result.error.message);
  return Number(result.data ?? 0);
}

export const recommendationAnalyticsRepository = {
  getConsent,
  setConsent,
  sourceExists,
  capture,
  aggregate,
  applyAnalyticsRetention,
};
