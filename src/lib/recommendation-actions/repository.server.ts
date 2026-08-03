/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  RecommendationActionEventRecord,
  RecommendationActionRecord,
  RecommendationActionSource,
} from "./types";
import type { RecommendationActionState } from "./model";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function event(row: Record<string, any>): RecommendationActionEventRecord {
  return {
    id: row.id,
    actionId: row.action_id,
    planId: row.plan_id,
    portfolioItemId: row.portfolio_item_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    actionVersion: row.action_version,
    command: row.command,
    previousState: row.previous_state,
    currentState: row.current_state,
    accountableOwnerId: row.accountable_owner_id,
    contributorIds: row.contributor_ids ?? [],
    targetDate: row.target_date,
    note: row.note,
    completionNote: row.completion_note,
    evidenceReferences: row.evidence_references ?? [],
    evidenceNotAvailableReason: row.evidence_not_available_reason,
    dependencyOverride: row.dependency_override,
    blockingDependencyIds: row.blocking_dependency_ids ?? [],
    dependencyOverrideReason: row.dependency_override_reason,
    dependencyOverrideAcknowledged: row.dependency_override_acknowledged,
    actorUserId: row.actor_user_id,
    idempotencyKey: row.idempotency_key,
    payloadHash: row.payload_hash,
    occurredAt: row.occurred_at,
  };
}

function action(
  row: Record<string, any>,
  history: Record<string, any>[] = [],
): RecommendationActionRecord {
  const plan = Array.isArray(row.recommendation_improvement_plans)
    ? row.recommendation_improvement_plans[0]
    : row.recommendation_improvement_plans;
  return {
    id: row.id,
    planId: row.plan_id,
    planVersion: plan?.plan_version ?? row.plan_version ?? 1,
    portfolioId: row.portfolio_id,
    portfolioItemId: row.portfolio_item_id,
    analysisRunId: row.analysis_run_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    sourceDecisionId: row.source_decision_id,
    sourceDecisionVersion: row.source_decision_version,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    status: row.status,
    version: row.action_version,
    accountableOwnerId: row.accountable_owner_id,
    contributorIds: row.contributor_ids ?? [],
    targetDate: row.target_date,
    note: row.note,
    completionNote: row.completion_note,
    evidenceReferences: row.evidence_references ?? [],
    evidenceNotAvailableReason: row.evidence_not_available_reason,
    latestEventId: row.latest_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    history: history.map(event),
  };
}

export async function getActionSource(
  portfolioItemId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationActionSource | null> {
  const [itemResult, decisionResult] = await Promise.all([
    database
      .from("recommendation_portfolio_items")
      .select(
        "id,portfolio_id,analysis_run_id,recommendation_id,recommendation_version,title,generated_sequence,organisation_id,workspace_id,dependencies",
      )
      .eq("id", portfolioItemId)
      .eq("organisation_id", tenant.organisationId)
      .eq("workspace_id", tenant.workspaceId)
      .maybeSingle(),
    database
      .from("recommendation_item_decisions")
      .select("id,portfolio_item_id,current_state,decision_version")
      .eq("portfolio_item_id", portfolioItemId)
      .eq("organisation_id", tenant.organisationId)
      .eq("workspace_id", tenant.workspaceId)
      .maybeSingle(),
  ]);
  if (itemResult.error || decisionResult.error) {
    throw new Error(itemResult.error?.message ?? decisionResult.error?.message);
  }
  if (!itemResult.data) return null;
  const row = itemResult.data;
  return {
    portfolioItemId: row.id,
    portfolioId: row.portfolio_id,
    analysisRunId: row.analysis_run_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    title: row.title,
    generatedSequence: row.generated_sequence,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    dependencies: (row.dependencies ?? []).map((dependency: Record<string, unknown>) => ({
      recommendationId: String(dependency.recommendationId ?? ""),
      type: dependency.type === "recommended" ? "recommended" : "required",
    })),
    decisionId: decisionResult.data?.id ?? null,
    decisionVersion: decisionResult.data?.decision_version ?? 0,
    decisionState: decisionResult.data?.current_state ?? "undecided",
  };
}

const selection = "*,recommendation_improvement_plans!inner(plan_version)";

export async function getActionById(
  actionId: string,
  tenant: { organisationId: string; workspaceId: string },
  includeHistory = false,
): Promise<RecommendationActionRecord | null> {
  const [current, events] = await Promise.all([
    database
      .from("recommendation_improvement_actions")
      .select(selection)
      .eq("id", actionId)
      .eq("organisation_id", tenant.organisationId)
      .eq("workspace_id", tenant.workspaceId)
      .maybeSingle(),
    includeHistory
      ? database
          .from("recommendation_improvement_action_events")
          .select("*")
          .eq("action_id", actionId)
          .eq("organisation_id", tenant.organisationId)
          .eq("workspace_id", tenant.workspaceId)
          .order("action_version", { ascending: true })
          .limit(10_001)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (current.error || events.error)
    throw new Error(current.error?.message ?? events.error?.message);
  if ((events.data?.length ?? 0) > 10_000) throw new Error("RECOMMENDATION_ACTION_EXPORT_LIMIT");
  return current.data ? action(current.data, events.data ?? []) : null;
}

export async function getActionForItem(
  portfolioItemId: string,
  planVersion: number,
  tenant: { organisationId: string; workspaceId: string },
  includeHistory = false,
) {
  const result = await database
    .from("recommendation_improvement_actions")
    .select(selection)
    .eq("portfolio_item_id", portfolioItemId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .eq("recommendation_improvement_plans.plan_version", planVersion)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;
  return includeHistory ? getActionById(result.data.id, tenant, true) : action(result.data);
}

export async function getActionsForPortfolio(
  portfolioId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const scoped = await database
    .from("recommendation_portfolios")
    .select("id")
    .eq("id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (scoped.error) throw new Error(scoped.error.message);
  if (!scoped.data) return null;
  const result = await database
    .from("recommendation_improvement_actions")
    .select(selection)
    .eq("portfolio_id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: true })
    .limit(251);
  if (result.error) throw new Error(result.error.message);
  if ((result.data?.length ?? 0) > 250) throw new Error("RECOMMENDATION_ACTION_LIMIT");
  return (result.data ?? []).map((row: Record<string, any>) => action(row));
}

export async function getDependencyActionStates(
  portfolioId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<Map<string, RecommendationActionState>> {
  const result = await database
    .from("recommendation_improvement_actions")
    .select("recommendation_id,status")
    .eq("portfolio_id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (result.error) throw new Error(result.error.message);
  return new Map<string, RecommendationActionState>(
    (result.data ?? []).map((row: Record<string, any>) => [
      String(row.recommendation_id),
      row.status as RecommendationActionState,
    ]),
  );
}

export async function getActionEventByIdempotency(
  idempotencyKey: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_improvement_action_events")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? event(result.data) : null;
}

export async function recordAction(input: Record<string, unknown>) {
  const result = await database.rpc("record_recommendation_improvement_action", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_ACTION_INVALID: command returned no action");
  return row as Record<string, unknown>;
}
