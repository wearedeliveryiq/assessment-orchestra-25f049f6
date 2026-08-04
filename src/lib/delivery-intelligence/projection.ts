import type { StoredIntelligenceResult } from "./result-repository.server";
import type { RecommendationPortfolioRecord } from "../recommendation-portfolio/types";
import type { DeliveryDnaCommercialAccessDecision } from "./commercial-access";
import { customerSafeConfidenceGuidance } from "./narrative";
import { projectOverviewIndustryContext } from "./industry-context";
import type { DeliveryDnaOverviewAccess } from "../delivery-dna/overview-access.server";

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

/** Superseded PDR-003-004 v1.0 authenticated projection, retained for compatibility tests. */
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
        practicalFirstStep: item.title,
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
    recommendations: presented.map(({ id: _id, ...item }) => item),
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

/** PDR-003-004 v1.1 bounded paid Overview projection. */
export function projectDeliveryDnaOverviewResult(input: {
  stored: StoredIntelligenceResult;
  portfolio: RecommendationPortfolioRecord | null;
  access: DeliveryDnaOverviewAccess;
}) {
  if (!input.access.permitted) throw new Error("DELIVERY_DNA_OVERVIEW_ACCESS_REQUIRED");
  const result = projectFreeWorkspaceResult(input.stored, input.portfolio);
  const relevantCapabilityIds = [
    ...result.findings.strengths,
    ...result.findings.priorityOpportunities,
  ];
  return {
    schemaVersion: "deliveryiq.delivery-dna-overview/1.0.0" as const,
    resultId: result.resultId,
    analysisRunId: result.analysisRunId,
    generatedAt: result.generatedAt,
    overall: {
      displayScore: result.overall.displayScore,
      band: result.overall.band,
    },
    confidence: {
      displayIndex: result.confidence.displayIndex,
      band: result.confidence.band,
      caveat: result.confidence.limitations[0] ?? null,
      improvementPrompts: result.confidence.improvementPrompts,
    },
    capabilities: result.capabilities.slice(0, 13),
    findings: {
      strengths: result.findings.strengths.slice(0, 5),
      priorityOpportunities: result.findings.priorityOpportunities.slice(0, 5),
    },
    recommendations: result.recommendations.slice(0, 3),
    roadmapPreview: result.roadmapPreview,
    executiveSummary: {
      overallPosition: result.executiveSummary.overallPosition,
      confidence: result.executiveSummary.confidence,
      caveat: result.executiveSummary.caveat,
    },
    overviewAccess: {
      access: input.access.access,
      productId: "delivery-dna-overview" as const,
      accessKey: "delivery_dna_overview" as const,
      accessVersion: "1.0.0" as const,
    },
    industryContext: projectOverviewIndustryContext(relevantCapabilityIds),
    downloadableReport: {
      available: true as const,
      href: `/api/delivery-dna-overviews/${input.stored.analysisRunId}/report.pdf`,
      label: "Download board-ready Overview",
    },
    action: {
      available: false as const,
      message:
        "Your Overview identifies what matters now. Decision tracking, assigned actions and outcome measurement are not included.",
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
