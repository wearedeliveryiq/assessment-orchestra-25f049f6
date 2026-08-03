import { availableRecommendationDecisionCommands } from "./model";
import type { RecommendationDecisionRecord } from "./types";

export type RecommendationDecisionAudience = "workspace" | "audit";

const stateCopy = {
  undecided: "No customer decision has been recorded.",
  accepted: "Accepted for the organisation's improvement plan.",
  deferred: "Deferred for review on the recorded date.",
  rejected: "Not being taken forward at this time.",
  superseded: "This advice has been superseded and cannot be changed.",
} as const;

export function projectRecommendationDecision(
  record: RecommendationDecisionRecord,
  audience: RecommendationDecisionAudience,
) {
  const base = {
    portfolioItemId: record.portfolioItemId,
    recommendationId: record.recommendationId,
    recommendationVersion: record.recommendationVersion,
    currentDecision: record.currentState,
    decisionVersion: record.version,
    reviewAt: record.reviewAt,
    reasonCategory: record.reasonCategory,
    acknowledged: record.acknowledged,
    availableActions: availableRecommendationDecisionCommands(record.currentState),
    statusMessage: stateCopy[record.currentState],
    updatedAt: record.updatedAt,
  };
  if (audience === "workspace") return base;
  return {
    ...base,
    decisionId: record.id,
    portfolioId: record.portfolioId,
    analysisRunId: record.analysisRunId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    lastActorType: record.lastActorType,
    lastActorUserId: record.lastActorUserId,
    history: record.history.map((event) => ({
      eventId: event.id,
      decisionVersion: event.decisionVersion,
      command: event.command,
      previousState: event.previousState,
      currentState: event.currentState,
      reasonCategory: event.reasonCategory,
      reviewAt: event.reviewAt,
      acknowledged: event.acknowledged,
      actorType: event.actorType,
      actorUserId: event.actorUserId,
      portfolioPolicyVersion: event.portfolioPolicyVersion,
      catalogueVersionId: event.catalogueVersionId,
      catalogueDigest: event.catalogueDigest,
      idempotencyKey: event.idempotencyKey,
      payloadHash: event.payloadHash,
      occurredAt: event.occurredAt,
    })),
  };
}
