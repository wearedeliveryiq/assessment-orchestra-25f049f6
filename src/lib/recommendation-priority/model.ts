import { sprint03Configuration } from "../delivery-intelligence/config";
import {
  calculateRecommendationRankScore,
  type RecommendationRankComponents,
} from "../delivery-intelligence/recommendations";
import {
  CatalogueValidationError,
  validateCatalogueSnapshot,
} from "../recommendation-catalogue/catalogue";
import type { CatalogueSnapshot } from "../recommendation-catalogue/types";

export const RECOMMENDATION_PRIORITY_POLICY_VERSION = "PB-004/S4-005/1.0.0";
export const RECOMMENDATION_PRIORITY_MODEL_VERSION = "deliveryiq.recommendation-priority/1.0.0";

export type RecommendationPriorityLabel = "critical" | "high" | "medium" | "low";

export interface RecommendationSourceRank extends RecommendationRankComponents {
  recommendationId: string;
  rankScore: number;
  impactBand: "low" | "medium" | "high";
  effortBand: "low" | "medium" | "high";
}

export interface RecommendationPriorityCandidateInput {
  resolutionCandidateId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  postConfidenceResult: "presented" | "evidence_first";
  sourceRecommendationIds: string[];
  sourceTraceNodeIds: string[];
  sourceRanks: RecommendationSourceRank[];
}

export interface RecommendationPriorityRationale {
  component: "impact" | "urgency" | "confidence" | "effort" | "dependency_readiness";
  statement: string;
}

export interface RecommendationPriorityItem {
  resolutionCandidateId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  postConfidenceResult: "presented" | "evidence_first";
  generatedRank: number;
  priorityLabel: RecommendationPriorityLabel;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  rawRankScore: number;
  components: RecommendationRankComponents;
  componentWeights: RecommendationRankComponents;
  rationale: RecommendationPriorityRationale[];
  sourceRecommendationIds: string[];
  sourceTraceNodeIds: string[];
}

export interface RecommendationPriorityOutput {
  schemaVersion: "deliveryiq.recommendation-priority/1.0.0";
  policyVersion: string;
  modelVersion: string;
  items: RecommendationPriorityItem[];
}

export class RecommendationPriorityError extends Error {
  readonly code = "RECOMMENDATION_PRIORITY_INVALID";
}

export function recommendationPriorityLabel(score: number): RecommendationPriorityLabel {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RecommendationPriorityError("Recommendation priority score is outside 0..100");
  }
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function rationale(input: {
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  confidenceState: "low" | "moderate" | "high";
  dependencyReadiness: number;
}): RecommendationPriorityRationale[] {
  return [
    { component: "impact", statement: `Governed impact is ${input.impact}.` },
    { component: "urgency", statement: "Approved evidence urgency contributes to this priority." },
    {
      component: "confidence",
      statement: `Analysis confidence is ${input.confidenceState}.`,
    },
    {
      component: "effort",
      statement: `Governed effort is ${input.effort}; this is not a delivery estimate.`,
    },
    {
      component: "dependency_readiness",
      statement:
        input.dependencyReadiness === 100
          ? "Approved dependencies are available for prioritisation."
          : "A required dependency is not yet available in the eligible set.",
    },
  ];
}

function confidenceState(value: number): "low" | "moderate" | "high" {
  const gates = sprint03Configuration.recommendationPolicy.confidenceGates;
  if (value >= gates.highMinimum) return "high";
  if (value >= gates.moderateMinimum) return "moderate";
  return "low";
}

function assertUnique(values: string[], name: string) {
  if (!values.length || new Set(values).size !== values.length) {
    throw new RecommendationPriorityError(`${name} must be non-empty and unique`);
  }
}

export function buildRecommendationPriority(input: {
  snapshot: CatalogueSnapshot;
  analysisConfidence: number;
  candidates: RecommendationPriorityCandidateInput[];
}): RecommendationPriorityOutput {
  let snapshot: CatalogueSnapshot;
  try {
    snapshot = validateCatalogueSnapshot(input.snapshot);
  } catch (error) {
    if (error instanceof CatalogueValidationError) {
      throw new RecommendationPriorityError(error.message);
    }
    throw error;
  }
  const definitions = new Map(snapshot.definitions.map((item) => [item.id, item]));
  const policy = sprint03Configuration.recommendationPolicy;
  const weights = { ...policy.rankFormula };
  const priorityItems = input.candidates.map((candidate) => {
    const definition = definitions.get(candidate.recommendationId);
    assertUnique(candidate.sourceRecommendationIds, "Source recommendation IDs");
    assertUnique(candidate.sourceTraceNodeIds, "Source trace node IDs");
    if (
      !definition ||
      definition.version !== candidate.recommendationVersion ||
      definition.order !== candidate.catalogueOrder ||
      !["presented", "evidence_first"].includes(candidate.postConfidenceResult)
    ) {
      throw new RecommendationPriorityError(
        `Priority candidate ${candidate.recommendationId} does not match the pinned catalogue`,
      );
    }
    if (
      candidate.sourceRanks.length !== candidate.sourceRecommendationIds.length ||
      new Set(candidate.sourceRanks.map((item) => item.recommendationId)).size !==
        candidate.sourceRanks.length ||
      candidate.sourceRanks.some(
        (item) => !candidate.sourceRecommendationIds.includes(item.recommendationId),
      )
    ) {
      throw new RecommendationPriorityError(
        `Priority sources for ${candidate.recommendationId} are incomplete`,
      );
    }
    for (const source of candidate.sourceRanks) {
      const calculated = calculateRecommendationRankScore({
        impact: source.impact,
        urgency: source.urgency,
        confidence: source.confidence,
        effortEase: source.effortEase,
        dependencyReadiness: source.dependencyReadiness,
      });
      if (calculated.stored !== source.rankScore) {
        throw new RecommendationPriorityError(
          `Stored rank for ${source.recommendationId} does not match DIQ-203`,
        );
      }
    }
    const canonicalSource = candidate.sourceRanks.find(
      (item) => item.recommendationId === candidate.recommendationId,
    );
    if (!canonicalSource) {
      throw new RecommendationPriorityError(
        `Canonical rank for ${candidate.recommendationId} is unavailable`,
      );
    }
    const impact = Math.max(...candidate.sourceRanks.map((item) => item.impact));
    const urgency = Math.max(...candidate.sourceRanks.map((item) => item.urgency));
    const impactBand = candidate.sourceRanks
      .filter((item) => item.impact === impact)
      .sort((left, right) =>
        left.recommendationId.localeCompare(right.recommendationId),
      )[0].impactBand;
    const effort = definition.effort;
    const effortEase = policy.effortEaseValues[effort];
    const components: RecommendationRankComponents = {
      impact,
      urgency,
      confidence: input.analysisConfidence,
      effortEase,
      dependencyReadiness: canonicalSource.dependencyReadiness,
    };
    const rawRankScore = calculateRecommendationRankScore(components).raw;
    return {
      ...candidate,
      generatedRank: 0,
      priorityLabel: recommendationPriorityLabel(rawRankScore),
      impact: impactBand,
      effort,
      rawRankScore,
      components,
      componentWeights: weights,
      rationale: rationale({
        impact: impactBand,
        effort,
        confidenceState: confidenceState(input.analysisConfidence),
        dependencyReadiness: components.dependencyReadiness,
      }),
      sourceRecommendationIds: [...candidate.sourceRecommendationIds].sort(),
      sourceTraceNodeIds: [...candidate.sourceTraceNodeIds].sort(),
    };
  });
  if (new Set(priorityItems.map((item) => item.recommendationId)).size !== priorityItems.length) {
    throw new RecommendationPriorityError("Priority candidates must be unique");
  }
  const ordered = [...priorityItems].sort(
    (left, right) =>
      right.rawRankScore - left.rawRankScore ||
      right.components.impact - left.components.impact ||
      right.components.urgency - left.components.urgency ||
      right.components.effortEase - left.components.effortEase ||
      left.catalogueOrder - right.catalogueOrder ||
      left.recommendationId.localeCompare(right.recommendationId),
  );
  return {
    schemaVersion: "deliveryiq.recommendation-priority/1.0.0",
    policyVersion: RECOMMENDATION_PRIORITY_POLICY_VERSION,
    modelVersion: RECOMMENDATION_PRIORITY_MODEL_VERSION,
    items: ordered.map((item, index) => ({ ...item, generatedRank: index + 1 })),
  };
}

export function applyDisplayOrderPreference<T extends RecommendationPriorityItem>(
  baseline: T[],
  orderedRecommendationIds: string[] | null,
) {
  const generated = [...baseline].sort((left, right) => left.generatedRank - right.generatedRank);
  if (!orderedRecommendationIds) {
    return generated.map((item) => ({ ...item, displayRank: item.generatedRank }));
  }
  if (
    orderedRecommendationIds.length !== generated.length ||
    new Set(orderedRecommendationIds).size !== generated.length ||
    orderedRecommendationIds.some(
      (id) => !generated.some((candidate) => candidate.recommendationId === id),
    )
  ) {
    throw new RecommendationPriorityError(
      "Display preference must contain every generated recommendation exactly once",
    );
  }
  const byId = new Map(generated.map((item) => [item.recommendationId, item]));
  return orderedRecommendationIds.map((id, index) => ({
    ...byId.get(id)!,
    displayRank: index + 1,
  }));
}
