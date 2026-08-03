import { recommendationPortfolioClasses, type RecommendationPortfolioClass } from "./model";
import type { RecommendationPortfolioRecord } from "./types";

export type RecommendationPortfolioAudience = "public" | "workspace" | "audit";

const classLabels: Record<RecommendationPortfolioClass, string> = {
  immediate_attention: "Immediate attention",
  foundation: "Foundation",
  quick_win: "Quick win",
  strategic_initiative: "Strategic initiative",
  watch: "Watch",
};

export function recommendationPortfolioEtag(
  record: Pick<RecommendationPortfolioRecord, "outputHash">,
) {
  return `"${record.outputHash}"`;
}

export function recommendationPortfolioEtagMatches(value: string | null, etag: string) {
  if (!value) return false;
  return value
    .split(",")
    .map((candidate) => candidate.trim())
    .some((candidate) => candidate === etag || candidate === "*");
}

export function projectRecommendationPortfolio(
  record: RecommendationPortfolioRecord,
  audience: RecommendationPortfolioAudience,
) {
  if (audience === "public") {
    return {
      portfolioState: record.state,
      recommendationCount: record.itemCount,
    };
  }

  const groups = recommendationPortfolioClasses.map((portfolioClass) => ({
    classification: portfolioClass,
    label: classLabels[portfolioClass],
    count: record.items.filter((item) => item.primaryClass === portfolioClass).length,
    recommendations: record.items
      .filter((item) => item.primaryClass === portfolioClass)
      .sort((left, right) => left.portfolioOrder - right.portfolioOrder)
      .map((item) => ({
        portfolioItemId: item.id,
        recommendationId: item.recommendationId,
        recommendationVersion: item.recommendationVersion,
        title: item.title,
        primaryClass: item.primaryClass,
        secondaryTags: item.secondaryTags,
        generatedRank: item.generatedRank,
        generatedSequence: item.generatedSequence,
        generatedHorizon: item.generatedHorizon,
        sequenceState: item.sequenceState,
        sequenceReason: item.sequenceReasonCode,
        priorityLabel: item.priorityLabel,
        impact: item.impact,
        effort: item.effort,
        why: {
          matchedTriggers: item.matchedTriggers,
          rationale: item.rationale,
        },
        confidence: {
          state: item.confidenceState,
          result: item.confidenceResult,
          caveat: item.confidenceCaveat,
        },
        dependencies: item.dependencies.map((dependency) => ({
          recommendationId: dependency.recommendationId,
          type: dependency.type,
          state: dependency.state,
          reason: dependency.reasonCode,
        })),
        blockingDependencyIds: item.blockingDependencyIds,
        caveats: item.caveats,
        outcome: item.outcome,
        successMeasures: item.successMeasures,
      })),
  }));
  const coveredItems = record.items.filter((item) => item.sourceTraceNodeIds.length > 0).length;
  const base = {
    portfolioId: record.id,
    analysisRunId: record.analysisRunId,
    generatedAt: record.createdAt,
    state: record.state,
    version: record.policyVersion,
    catalogue: {
      id: record.catalogueId,
      version: record.catalogueVersion,
    },
    summary: record.canonicalPortfolio.summary,
    traceCoverage: {
      visibleItems: record.itemCount,
      coveredItems,
      percentage: record.itemCount === 0 ? 100 : (coveredItems / record.itemCount) * 100,
    },
    groups,
  };
  if (audience === "workspace") return base;
  return {
    ...base,
    recommendationEvaluationId: record.recommendationEvaluationId,
    confidenceGateId: record.confidenceGateId,
    conflictResolutionId: record.conflictResolutionId,
    priorityModelId: record.priorityModelId,
    sequenceModelId: record.sequenceModelId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    configurationSetId: record.configurationSetId,
    catalogueVersionId: record.catalogueVersionId,
    catalogueDigest: record.catalogueDigest,
    projectorVersion: record.projectorVersion,
    inputHash: record.inputHash,
    outputHash: record.outputHash,
    groups: recommendationPortfolioClasses.map((portfolioClass) => ({
      classification: portfolioClass,
      label: classLabels[portfolioClass],
      count: record.items.filter((item) => item.primaryClass === portfolioClass).length,
      recommendations: record.items
        .filter((item) => item.primaryClass === portfolioClass)
        .sort((left, right) => left.portfolioOrder - right.portfolioOrder)
        .map((item) => ({
          portfolioItemId: item.id,
          priorityItemId: item.priorityItemId,
          sequenceItemId: item.sequenceItemId,
          resolutionCandidateId: item.resolutionCandidateId,
          recommendationDefinitionId: item.recommendationDefinitionId,
          recommendationId: item.recommendationId,
          recommendationVersion: item.recommendationVersion,
          catalogueOrder: item.catalogueOrder,
          portfolioOrder: item.portfolioOrder,
          primaryClass: item.primaryClass,
          secondaryTags: item.secondaryTags,
          generatedRank: item.generatedRank,
          generatedSequence: item.generatedSequence,
          generatedHorizon: item.generatedHorizon,
          sequenceState: item.sequenceState,
          sequenceReasonCode: item.sequenceReasonCode,
          priorityLabel: item.priorityLabel,
          impact: item.impact,
          effort: item.effort,
          urgency: item.urgency,
          matchedTriggers: item.matchedTriggers,
          rationale: item.rationale,
          confidenceState: item.confidenceState,
          confidenceResult: item.confidenceResult,
          confidenceCaveat: item.confidenceCaveat,
          dependencies: item.dependencies,
          blockingDependencyIds: item.blockingDependencyIds,
          caveats: item.caveats,
          outcome: item.outcome,
          successMeasures: item.successMeasures,
          sourceTraceNodeIds: item.sourceTraceNodeIds,
          semanticHash: item.semanticHash,
        })),
    })),
  };
}
