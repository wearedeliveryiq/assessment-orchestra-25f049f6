import type { StoredIntelligenceResult } from "./result-repository.server";

/** Workspace presentation contract: display-ready data, never calculation inputs or rule source. */
export function projectWorkspaceResult(stored: StoredIntelligenceResult) {
  const result = stored.canonicalResult;
  return {
    schemaVersion: "deliveryiq.workspace-result/1.0.0",
    resultId: stored.id,
    analysisRunId: stored.analysisRunId,
    generatedAt: result.generatedAt,
    versions: result.versions,
    overall: result.overall,
    confidence: {
      index: result.confidence.result.index,
      displayIndex: result.confidence.result.displayIndex,
      band: result.confidence.result.band,
      limitations: result.confidence.result.limitations,
      factors: result.confidence.factors,
    },
    capabilities: result.capabilities.map((capability) => ({
      id: capability.id,
      label: capability.label,
      order: capability.order,
      available: capability.score.available,
      rawScore: capability.score.rawScore,
      displayScore: capability.score.displayScore,
      band: capability.score.band,
      eligibleAnswerCount: capability.score.eligibleQuestionCount,
      totalQuestionCount:
        capability.score.eligibleQuestionCount +
        capability.score.missingQuestionIds.length +
        capability.score.excludedQuestionIds.length +
        capability.score.notApplicableQuestionIds.length,
      confidenceContribution: capability.confidenceContribution,
      state: capability.score.available ? "available" : "insufficient_evidence",
    })),
    findings: result.findings,
    patterns: result.patterns.detected,
    recommendations: result.recommendations.ranked.map(({ order: _order, ...item }) => item),
    withheldRecommendations: result.recommendations.withheld,
    roadmap: result.roadmap,
    executiveSummary: result.narrative,
  };
}
