import type { StoredIntelligenceResult } from "./result-repository.server";
import type { RecommendationPortfolioRecord } from "../recommendation-portfolio/types";
import type { DeliveryDnaCommercialAccessDecision } from "./commercial-access";
import { customerSafeConfidenceGuidance } from "./narrative";

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

function freePortfolioItemMap(portfolio: RecommendationPortfolioRecord | null) {
  return new Map((portfolio?.items ?? []).map((item) => [item.recommendationId, item]));
}

export function freePresentedRecommendationIds(
  stored: StoredIntelligenceResult,
  portfolio: RecommendationPortfolioRecord | null,
) {
  const items = freePortfolioItemMap(portfolio);
  return stored.canonicalResult.recommendations.ranked
    .filter((item) => items.has(item.id))
    .slice(0, 3)
    .map((item) => item.id);
}

/** PDR-003-004 authenticated free-account projection. */
export function projectFreeWorkspaceResult(
  stored: StoredIntelligenceResult,
  portfolio: RecommendationPortfolioRecord | null,
) {
  const result = stored.canonicalResult;
  const confidenceGuidance = customerSafeConfidenceGuidance(result.confidence.result.limitations);
  const items = freePortfolioItemMap(portfolio);
  const presentedAll = result.recommendations.ranked
    .filter((item) => items.has(item.id))
    .map((item) => {
      const portfolioItem = items.get(item.id)!;
      const narrativeIndex = result.recommendations.ranked.findIndex(
        (candidate) => candidate.id === item.id,
      );
      return {
        id: item.id,
        title: item.title,
        priorityLabel: portfolioItem.priorityLabel,
        impact: item.impact,
        effort: item.effort,
        safeReason: result.narrative.recommendations[narrativeIndex] ?? "",
        expectedOutcome: item.outcome,
      };
    });
  const presented = presentedAll.slice(0, 3);
  const recommendation = new Map(presentedAll.map((item) => [item.id, item]));
  const horizon = (name: "day30" | "day60" | "day90", label: "30 days" | "60 days" | "90 days") => {
    if (!("day30" in result.roadmap)) return [];
    const item = result.roadmap[name].find((candidate) => recommendation.has(candidate.id));
    const recommendationItem = item ? recommendation.get(item.id) : null;
    return item && recommendationItem
      ? [
          {
            title: recommendationItem.title,
            horizon: label,
            priorityLabel: recommendationItem.priorityLabel,
          },
        ]
      : [];
  };
  return {
    schemaVersion: "deliveryiq.workspace-free-result/1.0.0",
    resultId: stored.id,
    analysisRunId: stored.analysisRunId,
    generatedAt: result.generatedAt,
    overall: {
      available: result.overall.available,
      displayScore: result.overall.displayScore,
      band: result.overall.band,
    },
    confidence: {
      index: result.confidence.result.index,
      displayIndex: result.confidence.result.displayIndex,
      band: result.confidence.result.band,
      limitations: confidenceGuidance.limitations,
      improvementPrompts: confidenceGuidance.improvementPrompts,
    },
    capabilities: result.capabilities.map((capability) => ({
      id: capability.id,
      label: capability.label,
      order: capability.order,
      available: capability.score.available,
      displayScore: capability.score.displayScore,
      band: capability.score.band,
      eligibleAnswerCount: capability.score.eligibleQuestionCount,
      totalQuestionCount:
        capability.score.eligibleQuestionCount +
        capability.score.missingQuestionIds.length +
        capability.score.excludedQuestionIds.length +
        capability.score.notApplicableQuestionIds.length,
      state: capability.score.available ? "available" : "insufficient_evidence",
    })),
    findings: {
      strengths: result.findings.strengths.slice(0, 5),
      priorityOpportunities: result.findings.priorityOpportunities.slice(0, 5),
    },
    patterns: undefined,
    recommendations: presented.map(({ id: _id, ...item }) => item),
    withheldRecommendations: undefined,
    roadmap: undefined,
    roadmapPreview: {
      day30: horizon("day30", "30 days"),
      day60: horizon("day60", "60 days"),
      day90: horizon("day90", "90 days"),
    },
    executiveSummary: {
      ...result.narrative,
      recommendations: result.narrative.recommendations.slice(0, 3),
    },
  };
}

export function projectCommercialWorkspaceResult(input: {
  stored: StoredIntelligenceResult;
  portfolio: RecommendationPortfolioRecord | null;
  access: DeliveryDnaCommercialAccessDecision;
}) {
  const result =
    input.access.accessTier === "entitled"
      ? { ...projectWorkspaceResult(input.stored), roadmapPreview: null }
      : projectFreeWorkspaceResult(input.stored, input.portfolio);
  return { ...result, commercialAccess: input.access };
}
