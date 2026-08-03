import { applyDisplayOrderPreference } from "./model";
import type { RecommendationPriorityRecord } from "./types";

export type RecommendationPriorityAudience = "public" | "workspace" | "audit";

export function projectRecommendationPriority(
  record: RecommendationPriorityRecord,
  audience: RecommendationPriorityAudience,
) {
  const ordered = applyDisplayOrderPreference(
    record.items,
    record.preference?.orderedRecommendationIds ?? null,
  );
  if (audience === "public") {
    return { recommendationCount: ordered.length };
  }
  const base = {
    priorityModelId: record.id,
    analysisRunId: record.analysisRunId,
    generatedAt: record.createdAt,
    policyVersion: record.policyVersion,
    orderSource: record.preference ? ("customer_preference" as const) : ("generated" as const),
    preferenceVersion: record.preference?.version ?? 0,
    recommendations: ordered.map((item) => ({
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      generatedRank: item.generatedRank,
      displayRank: item.displayRank,
      priorityLabel: item.priorityLabel,
      impact: item.impact,
      effort: item.effort,
      state: item.postConfidenceResult,
      rationale: item.rationale,
    })),
  };
  if (audience === "workspace") return base;
  return {
    ...base,
    intelligenceResultId: record.intelligenceResultId,
    recommendationEvaluationId: record.recommendationEvaluationId,
    confidenceGateId: record.confidenceGateId,
    conflictResolutionId: record.conflictResolutionId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    configurationSetId: record.configurationSetId,
    catalogueVersionId: record.catalogueVersionId,
    catalogueDigest: record.catalogueDigest,
    modelVersion: record.modelVersion,
    inputHash: record.inputHash,
    outputHash: record.outputHash,
    preference: record.preference
      ? {
          id: record.preference.id,
          version: record.preference.version,
          previousPreferenceId: record.preference.previousPreferenceId,
          actorUserId: record.preference.actorUserId,
          createdAt: record.preference.createdAt,
        }
      : null,
    recommendations: ordered.map((item) => ({
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      generatedRank: item.generatedRank,
      displayRank: item.displayRank,
      priorityLabel: item.priorityLabel,
      impact: item.impact,
      effort: item.effort,
      state: item.postConfidenceResult,
      rawRankScore: item.rawRankScore,
      components: item.components,
      componentWeights: item.componentWeights,
      rationale: item.rationale,
      sourceRecommendationIds: item.sourceRecommendationIds,
      sourceTraceNodeIds: item.sourceTraceNodeIds,
      semanticHash: item.semanticHash,
    })),
  };
}
