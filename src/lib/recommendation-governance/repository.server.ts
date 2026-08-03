/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  RecommendationAuditExport,
  RecommendationAuditExportJob,
  RecommendationAuditSource,
  RecommendationOperationalHealth,
} from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function job(row: Record<string, any>): RecommendationAuditExportJob {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    portfolioId: row.portfolio_id,
    requestedBy: row.requested_by,
    status: row.status,
    attempt: Number(row.attempt),
    retryable: Boolean(row.retryable),
    failureCode: row.failure_code ?? null,
    leaseOwner: row.lease_owner ?? null,
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    availableUntil: row.available_until ?? null,
    payloadHash: row.payload_hash ?? null,
    payload: (row.export_payload as RecommendationAuditExport | null) ?? null,
  };
}

async function one(
  table: string,
  id: string,
  scope?: { organisationId: string; workspaceId: string },
) {
  let query = database.from(table).select("*").eq("id", id);
  if (scope) {
    query = query.eq("organisation_id", scope.organisationId).eq("workspace_id", scope.workspaceId);
  }
  const result = await query.maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as Record<string, unknown> | null) ?? null;
}

async function many(
  table: string,
  field: string,
  value: string,
  scope?: { organisationId: string; workspaceId: string },
) {
  let query = database.from(table).select("*").eq(field, value);
  if (scope) {
    query = query.eq("organisation_id", scope.organisationId).eq("workspace_id", scope.workspaceId);
  }
  const result = await query.limit(10_000);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Record<string, unknown>[];
}

export async function requestExport(input: Record<string, unknown>) {
  const result = await database.rpc("request_recommendation_audit_export", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_AUDIT_EXPORT_INVALID");
  return job(row);
}

export async function getExport(
  id: string,
  scope: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_audit_export_jobs")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", scope.organisationId)
    .eq("workspace_id", scope.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? job(result.data) : null;
}

export async function claimExports(limit = 10) {
  const result = await database.rpc("claim_recommendation_audit_exports", { p_limit: limit });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map(job);
}

export async function completeExport(
  id: string,
  leaseOwner: string,
  payload: RecommendationAuditExport,
  payloadHash: string,
) {
  const result = await database.rpc("complete_recommendation_audit_export", {
    p_id: id,
    p_lease_owner: leaseOwner,
    p_payload: payload,
    p_payload_hash: payloadHash,
  });
  if (result.error) throw new Error(result.error.message);
  return job(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function failExport(id: string, leaseOwner: string, failureCode: string) {
  const result = await database.rpc("fail_recommendation_audit_export", {
    p_id: id,
    p_lease_owner: leaseOwner,
    p_failure_code: failureCode,
  });
  if (result.error) throw new Error(result.error.message);
  return job(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function retryExport(
  id: string,
  scope: { organisationId: string; workspaceId: string },
) {
  const result = await database.rpc("retry_recommendation_audit_export", {
    p_id: id,
    p_organisation_id: scope.organisationId,
    p_workspace_id: scope.workspaceId,
  });
  if (result.error) throw new Error(result.error.message);
  return job(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function recordExportAccess(input: {
  id: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  mode: "status" | "download";
}) {
  const result = await database.rpc("record_recommendation_export_access", {
    p_id: input.id,
    p_organisation_id: input.organisationId,
    p_workspace_id: input.workspaceId,
    p_actor_user_id: input.actorUserId,
    p_mode: input.mode,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function loadAuditSource(input: {
  portfolioId: string;
  organisationId: string;
  workspaceId: string;
}): Promise<RecommendationAuditSource | null> {
  const scope = { organisationId: input.organisationId, workspaceId: input.workspaceId };
  const portfolio = await one("recommendation_portfolios", input.portfolioId, scope);
  if (!portfolio) return null;
  const ids = {
    catalogue: String(portfolio.catalogue_version_id),
    evaluation: String(portfolio.recommendation_evaluation_id),
    confidence: String(portfolio.confidence_gate_id),
    resolution: String(portfolio.conflict_resolution_id),
    priority: String(portfolio.priority_model_id),
    sequence: String(portfolio.sequence_model_id),
  };
  const [
    portfolioItems,
    catalogueVersion,
    catalogueDefinitions,
    catalogueApprovals,
    catalogueLifecycle,
    evaluation,
    evaluationCandidates,
    confidenceGate,
    confidenceCandidates,
    resolution,
    resolutionCandidates,
    priorityModel,
    priorityItems,
    sequenceModel,
    sequenceItems,
    sequenceDependencies,
    decisionEvents,
    decisions,
    plans,
    actionEvents,
    actions,
  ] = await Promise.all([
    many("recommendation_portfolio_items", "portfolio_id", input.portfolioId, scope),
    one("recommendation_catalogue_versions", ids.catalogue),
    many("recommendation_definitions", "catalogue_version_id", ids.catalogue),
    many("recommendation_catalogue_approvals", "catalogue_version_id", ids.catalogue),
    many("recommendation_catalogue_lifecycle_events", "catalogue_version_id", ids.catalogue),
    one("recommendation_evaluations", ids.evaluation, scope),
    many("recommendation_candidate_evaluations", "evaluation_id", ids.evaluation, scope),
    one("recommendation_confidence_gates", ids.confidence, scope),
    many("recommendation_candidate_confidence_gates", "confidence_gate_id", ids.confidence, scope),
    one("recommendation_conflict_resolutions", ids.resolution, scope),
    many("recommendation_resolution_candidates", "resolution_id", ids.resolution, scope),
    one("recommendation_priority_models", ids.priority, scope),
    many("recommendation_priority_items", "priority_model_id", ids.priority, scope),
    one("recommendation_sequence_models", ids.sequence, scope),
    many("recommendation_sequence_items", "sequence_model_id", ids.sequence, scope),
    many("recommendation_sequence_dependencies", "sequence_model_id", ids.sequence, scope),
    many("recommendation_decision_events", "portfolio_id", input.portfolioId, scope),
    many("recommendation_item_decisions", "portfolio_id", input.portfolioId, scope),
    many("recommendation_improvement_plans", "portfolio_id", input.portfolioId, scope),
    many("recommendation_improvement_action_events", "portfolio_id", input.portfolioId, scope),
    many("recommendation_improvement_actions", "portfolio_id", input.portfolioId, scope),
  ]);
  if (
    !catalogueVersion ||
    !evaluation ||
    !confidenceGate ||
    !resolution ||
    !priorityModel ||
    !sequenceModel
  ) {
    throw new Error("RECOMMENDATION_AUDIT_INTEGRITY_FAILED");
  }
  const itemIds = portfolioItems.map((row) => String(row.id));
  let handoffs: Record<string, unknown>[] = [];
  if (itemIds.length) {
    const result = await database
      .from("recommendation_product_handoffs")
      .select("*")
      .in("source_portfolio_item_id", itemIds)
      .eq("organisation_id", scope.organisationId)
      .eq("workspace_id", scope.workspaceId)
      .limit(10_000);
    if (result.error) throw new Error(result.error.message);
    handoffs = result.data ?? [];
  }
  const handoffIds = handoffs.map((row) => String(row.id));
  let handoffEvents: Record<string, unknown>[] = [];
  if (handoffIds.length) {
    const result = await database
      .from("recommendation_product_handoff_events")
      .select("*")
      .in("handoff_id", handoffIds)
      .eq("organisation_id", scope.organisationId)
      .eq("workspace_id", scope.workspaceId)
      .limit(10_000);
    if (result.error) throw new Error(result.error.message);
    handoffEvents = result.data ?? [];
  }
  const actionIds = actions.map((row) => String(row.id));
  let actionOutcomes: Record<string, unknown>[] = [];
  if (actionIds.length) {
    const result = await database
      .from("recommendation_action_outcomes")
      .select("*")
      .in("action_id", actionIds)
      .eq("organisation_id", scope.organisationId)
      .eq("workspace_id", scope.workspaceId)
      .limit(10_000);
    if (result.error) throw new Error(result.error.message);
    actionOutcomes = result.data ?? [];
  }
  const outcomeIds = actionOutcomes.map((row) => String(row.id));
  let outcomeMeasureVersions: Record<string, unknown>[] = [];
  if (outcomeIds.length) {
    const result = await database
      .from("recommendation_outcome_measure_versions")
      .select("*")
      .in("outcome_id", outcomeIds)
      .eq("organisation_id", scope.organisationId)
      .eq("workspace_id", scope.workspaceId)
      .limit(10_000);
    if (result.error) throw new Error(result.error.message);
    outcomeMeasureVersions = result.data ?? [];
  }
  const measureVersionIds = outcomeMeasureVersions.map((row) => String(row.id));
  let outcomeObservations: Record<string, unknown>[] = [];
  let outcomeStatusEvents: Record<string, unknown>[] = [];
  if (measureVersionIds.length) {
    const [observationsResult, eventsResult] = await Promise.all([
      database
        .from("recommendation_outcome_observations")
        .select("*")
        .in("measure_version_id", measureVersionIds)
        .eq("organisation_id", scope.organisationId)
        .eq("workspace_id", scope.workspaceId)
        .limit(10_000),
      database
        .from("recommendation_outcome_status_events")
        .select("*")
        .in("measure_version_id", measureVersionIds)
        .eq("organisation_id", scope.organisationId)
        .eq("workspace_id", scope.workspaceId)
        .limit(10_000),
    ]);
    if (observationsResult.error || eventsResult.error) {
      throw new Error(observationsResult.error?.message ?? eventsResult.error?.message);
    }
    outcomeObservations = observationsResult.data ?? [];
    outcomeStatusEvents = eventsResult.data ?? [];
  }
  return {
    portfolio,
    portfolioItems,
    catalogueVersion,
    catalogueDefinitions,
    catalogueApprovals,
    catalogueLifecycle,
    evaluation,
    evaluationCandidates,
    confidenceGate,
    confidenceCandidates,
    resolution,
    resolutionCandidates,
    priorityModel,
    priorityItems,
    sequenceModel,
    sequenceItems,
    sequenceDependencies,
    decisionEvents,
    decisions,
    plans,
    actionEvents,
    actions,
    actionOutcomes,
    outcomeMeasureVersions,
    outcomeObservations,
    outcomeStatusEvents,
    handoffs,
    handoffEvents,
  };
}

export async function featureEnabled(featureKey: string) {
  const result = await database.rpc("resolve_recommendation_feature_flag", {
    p_feature_key: featureKey,
  });
  if (result.error) return false;
  return result.data === true;
}

export async function setFeatureFlag(input: Record<string, unknown>) {
  const result = await database.rpc("set_recommendation_feature_flag", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  return Array.isArray(result.data) ? result.data[0] : result.data;
}

export async function getCatalogueVersionForDiff(id: string) {
  const result = await database
    .from("recommendation_catalogue_versions")
    .select("id,version,content_digest,snapshot")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data
    ? {
        id: result.data.id,
        version: result.data.version,
        contentDigest: result.data.content_digest,
        snapshot: result.data.snapshot as Record<string, unknown>,
      }
    : null;
}

export async function operationalHealth(): Promise<RecommendationOperationalHealth> {
  const result = await database.rpc("recommendation_operational_health", {});
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return {
    generatedAt: row.generated_at,
    status: row.status,
    metrics: {
      queuedExports: Number(row.queued_exports),
      processingExports: Number(row.processing_exports),
      failedExports: Number(row.failed_exports),
      oldestQueuedSeconds: Number(row.oldest_queued_seconds),
      criticalIntegrityFailures: Number(row.critical_integrity_failures),
      openCriticalAlerts: Number(row.open_critical_alerts),
    },
    alertCoverage: row.alert_coverage ?? [],
  };
}

export const recommendationGovernanceRepository = {
  requestExport,
  getExport,
  claimExports,
  completeExport,
  failExport,
  retryExport,
  recordExportAccess,
  loadAuditSource,
  featureEnabled,
  setFeatureFlag,
  getCatalogueVersionForDiff,
  operationalHealth,
};
