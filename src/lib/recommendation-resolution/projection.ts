import type { RecommendationResolutionRecord } from "./types";

export type RecommendationResolutionAudience = "public" | "workspace" | "audit";

export function projectRecommendationResolution(
  record: RecommendationResolutionRecord,
  audience: RecommendationResolutionAudience,
) {
  const canonical = record.candidates.filter(
    (candidate) => candidate.resolutionResult === "canonical",
  );
  const suppressed = record.candidates.filter(
    (candidate) => candidate.resolutionResult === "suppressed",
  );
  if (audience === "public") {
    return {
      recommendationCount: canonical.length,
      relatedActionsCombined: suppressed.filter(
        (candidate) => candidate.reasonCode === "deduplicated",
      ).length,
    };
  }
  if (audience === "workspace") {
    return {
      resolutionId: record.id,
      analysisRunId: record.analysisRunId,
      generatedAt: record.createdAt,
      policyVersion: record.policyVersion,
      recommendations: canonical.map((candidate) => ({
        recommendationId: candidate.recommendationId,
        recommendationVersion: candidate.recommendationVersion,
        state: candidate.postConfidenceResult,
        relatedActionsCombined: Math.max(0, candidate.sourceCandidateGateIds.length - 1),
      })),
      suppressed: {
        count: suppressed.length,
        relatedActionsCombined: suppressed.filter(
          (candidate) => candidate.reasonCode === "deduplicated",
        ).length,
      },
    };
  }
  return {
    resolutionId: record.id,
    analysisRunId: record.analysisRunId,
    recommendationEvaluationId: record.recommendationEvaluationId,
    confidenceGateId: record.confidenceGateId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    configurationSetId: record.configurationSetId,
    catalogueVersionId: record.catalogueVersionId,
    catalogueDigest: record.catalogueDigest,
    generatedAt: record.createdAt,
    policyVersion: record.policyVersion,
    resolverVersion: record.resolverVersion,
    candidates: record.candidates.map((candidate) => ({
      recommendationId: candidate.recommendationId,
      recommendationVersion: candidate.recommendationVersion,
      catalogueOrder: candidate.catalogueOrder,
      postConfidenceResult: candidate.postConfidenceResult,
      resolutionResult: candidate.resolutionResult,
      reasonCode: candidate.reasonCode,
      winnerRecommendationId: candidate.winnerRecommendationId,
      winnerRecommendationVersion: candidate.winnerRecommendationVersion,
      sourceCandidateGateIds: candidate.sourceCandidateGateIds,
      sourceTraceNodeIds: candidate.sourceTraceNodeIds,
      semanticHash: candidate.semanticHash,
    })),
  };
}
