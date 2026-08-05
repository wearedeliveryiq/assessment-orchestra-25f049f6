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

/** PDR-003-004 v2.1 bounded paid Overview projection (with historical 2.0 read support). */
export function projectDeliveryDnaOverviewResult(input: {
  stored: StoredIntelligenceResult;
  portfolio: RecommendationPortfolioRecord | null;
  access: DeliveryDnaOverviewAccess;
}) {
  if (!input.access.permitted) throw new Error("DELIVERY_DNA_OVERVIEW_ACCESS_REQUIRED");
  const canonical = input.stored.canonicalResult as unknown as {
    schemaVersion?: string;
    domains?: Array<{
      domainId: string;
      available: boolean;
      rawScore: number | null;
      band: string | null;
      availableCount: number;
    }>;
    industryContext?: Array<Record<string, unknown>>;
    capabilities: Array<{
      id: string;
      label: string;
      order: number;
      domainId?: string;
      score: {
        available: boolean;
        displayScore: number | null;
        band: string | null;
        eligibleQuestionCount: number;
        missingQuestionIds: string[];
        excludedQuestionIds: string[];
        notApplicableQuestionIds: string[];
      };
      confidenceContribution: number;
    }>;
    overall: { available: boolean; displayScore: number | null; band: string | null };
    confidence: {
      result: { displayIndex: number; band: string; limitations: string[] };
    };
    findings: {
      strengths: string[];
      priorityOpportunities: string[];
      insufficientEvidence: string[];
    };
    patterns: { detected: Array<Record<string, unknown>> };
    recommendations: {
      ranked: Array<{
        id: string;
        title: string;
        impact: string;
        effort: string;
        outcome?: string;
        firstStep?: string;
        reasonIds?: string[];
        successMeasures?: string[];
        [key: string]: unknown;
      }>;
    };
    roadmap: Record<string, unknown>;
    narrative: {
      overallPosition: string;
      confidence: string;
      strengths: string[];
      opportunities: string[];
      recommendations: string[];
      caveat: string | null;
    };
  };
  if (
    canonical.schemaVersion === "deliveryiq.intelligence-result/2.0.0" ||
    canonical.schemaVersion === "deliveryiq.intelligence-result/2.1.0"
  ) {
    const current = canonical.schemaVersion === "deliveryiq.intelligence-result/2.1.0";
    const recommendationById = new Map(
      canonical.recommendations.ranked.map((item) => [String(item.id), item]),
    );
    const roadmapPreview = Object.fromEntries(
      (["day30", "day60", "day90"] as const).map((horizon) => [
        horizon,
        ((canonical.roadmap[horizon] as Array<{ id: string }> | undefined) ?? []).map((item) => {
          const recommendation = recommendationById.get(item.id);
          return {
            id: item.id,
            title: String(recommendation?.title ?? item.id),
            horizon: horizon === "day30" ? "30 days" : horizon === "day60" ? "60 days" : "90 days",
            priorityLabel: "priority",
          };
        }),
      ]),
    ) as {
      day30: Array<{ id: string; title: string; horizon: string; priorityLabel: string }>;
      day60: Array<{ id: string; title: string; horizon: string; priorityLabel: string }>;
      day90: Array<{ id: string; title: string; horizon: string; priorityLabel: string }>;
    };
    const explainability = {
      overallPosition: canonical.narrative.overallPosition,
      confidence: canonical.narrative.confidence,
      strengths: canonical.narrative.strengths.slice(0, 5),
      opportunities: canonical.narrative.opportunities.slice(0, 5),
      recommendations: canonical.narrative.recommendations.slice(0, 3),
      caveat: canonical.narrative.caveat,
    };
    return {
      schemaVersion: current
        ? ("deliveryiq.delivery-dna-overview/2.1.0" as const)
        : ("deliveryiq.delivery-dna-overview/2.0.0" as const),
      resultId: input.stored.id,
      analysisRunId: input.stored.analysisRunId,
      generatedAt: input.stored.publishedAt,
      overall: {
        available: canonical.overall.available,
        displayScore: canonical.overall.displayScore,
        band: canonical.overall.band,
      },
      domains: (canonical.domains ?? []).slice(0, 5).map((domain) => ({
        id: domain.domainId,
        available: domain.available,
        displayScore:
          domain.rawScore === null
            ? null
            : Math.round((domain.rawScore + Number.EPSILON) * 10) / 10,
        band: domain.band,
        availableCapabilityCount: domain.availableCount,
      })),
      capabilities: canonical.capabilities.slice(0, 15).map((capability) => ({
        id: capability.id,
        label: capability.label,
        domainId: capability.domainId,
        order: capability.order,
        available: capability.score.available,
        displayScore: capability.score.displayScore,
        band: capability.score.band,
        eligibleAnswerCount: capability.score.eligibleQuestionCount,
        totalQuestionCount: 3,
        confidenceContribution: capability.confidenceContribution,
        state: capability.score.available ? "available" : "insufficient_evidence",
        limitation: capability.score.available
          ? null
          : "Insufficient eligible evidence for this capability.",
      })),
      confidence: {
        displayIndex: canonical.confidence.result.displayIndex,
        band: canonical.confidence.result.band,
        limitations: canonical.confidence.result.limitations,
        caveat:
          "Confidence describes evidential support, not correctness, independent verification or certainty.",
      },
      findings: {
        strengths: canonical.findings.strengths.slice(0, 5),
        priorityOpportunities: canonical.findings.priorityOpportunities.slice(0, 5),
        insufficientEvidence: canonical.findings.insufficientEvidence,
      },
      patterns: canonical.patterns.detected.slice(0, 5),
      recommendations: canonical.recommendations.ranked.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        impact: item.impact,
        effort: item.effort,
        priorityLabel: "priority",
        safeReason: Array.isArray(item.reasonIds)
          ? `Prioritised from ${item.reasonIds.join(", ")}.`
          : "Prioritised from the recorded Delivery DNA evidence.",
        expectedOutcome: item.outcome,
        practicalFirstStep: item.firstStep,
      })),
      roadmapDirection: roadmapPreview,
      roadmapPreview,
      industryContext: (canonical.industryContext ?? []).slice(0, 3).map((raw) => ({
        id: String(raw.evidenceId),
        evidenceId: String(raw.evidenceId),
        evidenceVersion: String(raw.evidenceVersion),
        approvedCustomerSafeWording: String(raw.approvedCustomerWording),
        publisher: String(raw.sourcePublisher),
        sourceTitle: String(raw.sourceTitle),
        evidenceYear: Number(raw.evidenceYear),
        scopeOrMethodCaveat: String(raw.scopeCaveat),
        notCustomerPredictionCaveat: String(raw.mandatoryDisclosure),
        originalSourceReference: String(raw.originalSourceReference),
      })),
      explainability,
      executiveSummary: explainability,
      overviewAccess: {
        access: input.access.access,
        productId: "delivery-dna-overview" as const,
        accessKey: "delivery_dna_overview" as const,
        accessVersion: current ? ("2.1.0" as const) : ("2.0.0" as const),
      },
      downloadableReport: {
        available: true as const,
        sectionCount: 7 as const,
        href: `/api/delivery-dna-overviews/${input.stored.analysisRunId}/report.pdf`,
        label: "Download my Delivery DNA Overview",
      },
      action: {
        available: false as const,
        message:
          "Decision tracking, assigned actions and outcome measurement are not included in this Overview.",
      },
    };
  }
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
