/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  RecommendationDecisionEventRecord,
  RecommendationDecisionPortfolioItem,
  RecommendationDecisionRecord,
} from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function event(row: Record<string, any>): RecommendationDecisionEventRecord {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    portfolioItemId: row.portfolio_item_id,
    analysisRunId: row.analysis_run_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    decisionVersion: row.decision_version,
    command: row.command,
    previousState: row.previous_state,
    currentState: row.current_state,
    reasonCategory: row.reason_category,
    reviewAt: row.review_at,
    acknowledged: row.acknowledged,
    actorType: row.actor_type,
    actorUserId: row.actor_user_id,
    portfolioPolicyVersion: row.portfolio_policy_version,
    catalogueVersionId: row.catalogue_version_id,
    catalogueDigest: row.catalogue_digest,
    idempotencyKey: row.idempotency_key,
    payloadHash: row.payload_hash,
    occurredAt: row.occurred_at,
  };
}

function item(row: Record<string, any>): RecommendationDecisionPortfolioItem {
  const portfolio = Array.isArray(row.recommendation_portfolios)
    ? row.recommendation_portfolios[0]
    : row.recommendation_portfolios;
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    analysisRunId: row.analysis_run_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    portfolioPolicyVersion: portfolio.policy_version,
    catalogueVersionId: portfolio.catalogue_version_id,
    catalogueDigest: portfolio.catalogue_digest,
  };
}

function decision(
  source: RecommendationDecisionPortfolioItem,
  row: Record<string, any> | null,
  history: Record<string, any>[],
): RecommendationDecisionRecord {
  return {
    id: row?.id ?? null,
    portfolioId: source.portfolioId,
    portfolioItemId: source.id,
    analysisRunId: source.analysisRunId,
    recommendationId: source.recommendationId,
    recommendationVersion: source.recommendationVersion,
    organisationId: source.organisationId,
    workspaceId: source.workspaceId,
    currentState: row?.current_state ?? "undecided",
    version: row?.decision_version ?? 0,
    reasonCategory: row?.reason_category ?? null,
    reviewAt: row?.review_at ?? null,
    acknowledged: row?.acknowledged ?? false,
    lastActorType: row?.last_actor_type ?? null,
    lastActorUserId: row?.last_actor_user_id ?? null,
    updatedAt: row?.updated_at ?? null,
    history: history.map(event),
  };
}

export async function getPortfolioItem(
  portfolioItemId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationDecisionPortfolioItem | null> {
  const result = await database
    .from("recommendation_portfolio_items")
    .select(
      "id,portfolio_id,analysis_run_id,recommendation_id,recommendation_version,organisation_id,workspace_id,recommendation_portfolios!inner(policy_version,catalogue_version_id,catalogue_digest)",
    )
    .eq("id", portfolioItemId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? item(result.data) : null;
}

export async function getPortfolioItems(
  portfolioId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationDecisionPortfolioItem[] | null> {
  const scopedPortfolio = await database
    .from("recommendation_portfolios")
    .select("id")
    .eq("id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (scopedPortfolio.error) throw new Error(scopedPortfolio.error.message);
  if (!scopedPortfolio.data) return null;
  const result = await database
    .from("recommendation_portfolio_items")
    .select(
      "id,portfolio_id,analysis_run_id,recommendation_id,recommendation_version,organisation_id,workspace_id,recommendation_portfolios!inner(policy_version,catalogue_version_id,catalogue_digest)",
    )
    .eq("portfolio_id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("portfolio_order", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map(item);
}

export async function getDecision(
  source: RecommendationDecisionPortfolioItem,
  includeHistory = true,
): Promise<RecommendationDecisionRecord> {
  const [current, events] = await Promise.all([
    database
      .from("recommendation_item_decisions")
      .select("*")
      .eq("portfolio_item_id", source.id)
      .eq("organisation_id", source.organisationId)
      .eq("workspace_id", source.workspaceId)
      .maybeSingle(),
    includeHistory
      ? database
          .from("recommendation_decision_events")
          .select("*")
          .eq("portfolio_item_id", source.id)
          .eq("organisation_id", source.organisationId)
          .eq("workspace_id", source.workspaceId)
          .order("decision_version", { ascending: true })
          .limit(10_001)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (current.error || events.error)
    throw new Error(current.error?.message ?? events.error?.message);
  if ((events.data?.length ?? 0) > 10_000) {
    throw new Error("RECOMMENDATION_DECISION_EXPORT_LIMIT");
  }
  return decision(source, current.data, events.data ?? []);
}

export async function getDecisionsForItems(
  sources: RecommendationDecisionPortfolioItem[],
  includeHistory = false,
): Promise<RecommendationDecisionRecord[]> {
  if (!sources.length) return [];
  const ids = sources.map((source) => source.id);
  const organisationId = sources[0].organisationId;
  const workspaceId = sources[0].workspaceId;
  const [current, events] = await Promise.all([
    database
      .from("recommendation_item_decisions")
      .select("*")
      .in("portfolio_item_id", ids)
      .eq("organisation_id", organisationId)
      .eq("workspace_id", workspaceId),
    includeHistory
      ? database
          .from("recommendation_decision_events")
          .select("*")
          .in("portfolio_item_id", ids)
          .eq("organisation_id", organisationId)
          .eq("workspace_id", workspaceId)
          .order("decision_version", { ascending: true })
          .limit(10_001)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (current.error || events.error)
    throw new Error(current.error?.message ?? events.error?.message);
  if ((events.data?.length ?? 0) > 10_000) {
    throw new Error("RECOMMENDATION_DECISION_EXPORT_LIMIT");
  }
  const currentByItem = new Map(
    (current.data ?? []).map((row: Record<string, any>) => [row.portfolio_item_id, row]),
  );
  const historyByItem = new Map<string, Record<string, any>[]>();
  for (const row of events.data ?? []) {
    const values = historyByItem.get(row.portfolio_item_id) ?? [];
    values.push(row);
    historyByItem.set(row.portfolio_item_id, values);
  }
  return sources.map((source) =>
    decision(source, currentByItem.get(source.id) ?? null, historyByItem.get(source.id) ?? []),
  );
}

export async function getDecisionEventByIdempotency(
  idempotencyKey: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationDecisionEventRecord | null> {
  const result = await database
    .from("recommendation_decision_events")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? event(result.data) : null;
}

export async function recordDecision(input: Record<string, unknown>) {
  const result = await database.rpc("record_recommendation_item_decision", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_DECISION_INVALID: command returned no decision");
  return row as Record<string, unknown>;
}
