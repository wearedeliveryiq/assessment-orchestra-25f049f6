import type { RecommendationEvaluationRecord } from "./types";

export function projectRecommendationEvaluation(
  record: RecommendationEvaluationRecord,
  canAudit: boolean,
) {
  const candidates = canAudit
    ? record.candidates
    : record.candidates.filter((candidate) => candidate.result === "eligible");
  return {
    evaluationId: record.id,
    analysisRunId: record.analysisRunId,
    generatedAt: record.createdAt,
    catalogue: {
      id: record.catalogueId,
      version: record.catalogueVersion,
      digest: record.catalogueDigest,
    },
    policyVersion: record.policyVersion,
    candidates: candidates.map((candidate) => ({
      recommendationId: candidate.recommendationId,
      recommendationVersion: candidate.recommendationVersion,
      result: candidate.result,
      confidenceState: candidate.confidenceState,
      matchedTriggers: candidate.matchedTriggers,
      unmetPrerequisites: candidate.unmetPrerequisites,
      ...(canAudit
        ? {
            unmetTriggers: candidate.unmetTriggers,
            exclusions: candidate.exclusions,
            decisiveFacts: candidate.decisiveFacts,
            semanticHash: candidate.semanticHash,
            traceIds: candidate.sourceTraceNodeIds,
          }
        : {}),
    })),
  };
}
