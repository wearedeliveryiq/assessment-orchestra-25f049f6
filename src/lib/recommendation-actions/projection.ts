import type { RecommendationActionRecord } from "./types";

export type RecommendationActionAudience = "workspace" | "audit";

const statusCopy = {
  not_started: "Action agreed but not started.",
  in_progress: "Action is in progress.",
  blocked: "Action is blocked and needs attention.",
  completed: "Action completed; this records activity, not proof of improvement.",
  cancelled: "Action cancelled. Its history has been retained.",
} as const;

export function projectRecommendationAction(
  record: RecommendationActionRecord,
  audience: RecommendationActionAudience,
) {
  const base = {
    actionId: record.id,
    portfolioItemId: record.portfolioItemId,
    recommendationId: record.recommendationId,
    recommendationVersion: record.recommendationVersion,
    planVersion: record.planVersion,
    status: record.status,
    actionVersion: record.version,
    accountableOwnerId: record.accountableOwnerId,
    contributorIds: record.contributorIds,
    targetDate: record.targetDate,
    note: record.note,
    completionNote: record.completionNote,
    evidenceReferences: record.evidenceReferences,
    evidenceNotAvailableReason: record.evidenceNotAvailableReason,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    updatedAt: record.updatedAt,
    statusMessage: statusCopy[record.status],
  };
  if (audience === "workspace") return base;
  return {
    ...base,
    planId: record.planId,
    portfolioId: record.portfolioId,
    analysisRunId: record.analysisRunId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    sourceDecisionId: record.sourceDecisionId,
    sourceDecisionVersion: record.sourceDecisionVersion,
    latestEventId: record.latestEventId,
    history: record.history,
  };
}
