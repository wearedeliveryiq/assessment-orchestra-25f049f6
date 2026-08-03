import type { RecommendationPriorityRationale } from "../recommendation-priority/model";
import type {
  RecommendationSequenceCaveat,
  RecommendationSequenceDependency,
  RecommendationSequenceHorizon,
  RecommendationSequenceState,
} from "../recommendation-sequencing/model";

export const RECOMMENDATION_PORTFOLIO_POLICY_VERSION = "PB-004/S4-007/1.0.0";
export const RECOMMENDATION_PORTFOLIO_PROJECTOR_VERSION =
  "deliveryiq.recommendation-portfolio/1.0.0";

export const recommendationPortfolioClasses = [
  "immediate_attention",
  "foundation",
  "quick_win",
  "strategic_initiative",
  "watch",
] as const;

export type RecommendationPortfolioClass = (typeof recommendationPortfolioClasses)[number];
export type RecommendationPortfolioState = "empty" | "partial" | "complete";

export interface RecommendationPortfolioDependency {
  recommendationId: string;
  sourceDependencyId: string;
  type: "required" | "recommended";
  state: "available" | "blocked" | "unavailable";
  resolution: "direct" | "superseded" | "deduplicated" | "unavailable";
  reasonCode: RecommendationSequenceDependency["reasonCode"];
}

export interface RecommendationPortfolioCandidateInput {
  priorityItemId: string;
  sequenceItemId: string;
  resolutionCandidateId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  title: string;
  outcome: string;
  successMeasures: string[];
  matchedTriggers: string[];
  generatedRank: number;
  priorityLabel: "critical" | "high" | "medium" | "low";
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  urgency: number;
  confidenceState: "low" | "moderate" | "high";
  confidenceResult: "presented" | "evidence_first";
  confidenceCaveat: string | null;
  generatedSequence: number | null;
  generatedHorizon: RecommendationSequenceHorizon | null;
  sequenceState: RecommendationSequenceState;
  sequenceReasonCode:
    | "dependency_precedence"
    | "dependency_satisfied"
    | "rank_and_horizon_fit"
    | "blocked_dependency"
    | "capacity_exceeded";
  blockingDependencyIds: string[];
  dependencies: RecommendationPortfolioDependency[];
  caveats: RecommendationSequenceCaveat[];
  rationale: RecommendationPriorityRationale[];
  sourceTraceNodeIds: string[];
}

export interface RecommendationPortfolioItem extends RecommendationPortfolioCandidateInput {
  portfolioOrder: number;
  primaryClass: RecommendationPortfolioClass;
  secondaryTags: RecommendationPortfolioClass[];
}

export interface RecommendationPortfolioSummary {
  state: RecommendationPortfolioState;
  itemCount: number;
  scheduledCount: number;
  blockedCount: number;
  capacityExceededCount: number;
  classCounts: Record<RecommendationPortfolioClass, number>;
}

export interface RecommendationPortfolioOutput {
  schemaVersion: "deliveryiq.recommendation-portfolio/1.0.0";
  policyVersion: string;
  projectorVersion: string;
  summary: RecommendationPortfolioSummary;
  items: RecommendationPortfolioItem[];
}

export class RecommendationPortfolioError extends Error {
  readonly code = "PORTFOLIO_PUBLICATION_FAILED";
}

function uniqueNonEmpty(values: string[], label: string) {
  if (!values.length || new Set(values).size !== values.length) {
    throw new RecommendationPortfolioError(`${label} must be non-empty and unique`);
  }
}

function validateCandidate(candidate: RecommendationPortfolioCandidateInput) {
  if (
    !candidate.priorityItemId ||
    !candidate.sequenceItemId ||
    !candidate.resolutionCandidateId ||
    !candidate.recommendationDefinitionId ||
    !candidate.recommendationId ||
    !candidate.title.trim() ||
    !candidate.outcome.trim() ||
    !/^\d+\.\d+\.\d+$/.test(candidate.recommendationVersion) ||
    !Number.isInteger(candidate.catalogueOrder) ||
    candidate.catalogueOrder < 1 ||
    !Number.isInteger(candidate.generatedRank) ||
    candidate.generatedRank < 1 ||
    !Number.isFinite(candidate.urgency) ||
    candidate.urgency < 0 ||
    candidate.urgency > 100
  ) {
    throw new RecommendationPortfolioError(
      `Portfolio candidate ${candidate.recommendationId || "unknown"} is invalid`,
    );
  }
  uniqueNonEmpty(candidate.successMeasures, "Success measures");
  uniqueNonEmpty(candidate.matchedTriggers, "Matched triggers");
  uniqueNonEmpty(candidate.sourceTraceNodeIds, "Source trace node IDs");
  if (
    new Set(candidate.blockingDependencyIds).size !== candidate.blockingDependencyIds.length ||
    new Set(
      candidate.dependencies.map(
        (dependency) => `${dependency.sourceDependencyId}:${dependency.type}`,
      ),
    ).size !== candidate.dependencies.length
  ) {
    throw new RecommendationPortfolioError(
      `Portfolio dependency evidence for ${candidate.recommendationId} is invalid`,
    );
  }
  if (
    candidate.sequenceState === "scheduled" &&
    (candidate.generatedSequence === null || candidate.generatedHorizon === null)
  ) {
    throw new RecommendationPortfolioError(
      `Scheduled portfolio item ${candidate.recommendationId} lacks sequence placement`,
    );
  }
  if (
    candidate.sequenceState !== "scheduled" &&
    (candidate.generatedSequence !== null || candidate.generatedHorizon !== null)
  ) {
    throw new RecommendationPortfolioError(
      `Unscheduled portfolio item ${candidate.recommendationId} has a sequence placement`,
    );
  }
}

function matchedClasses(
  candidate: RecommendationPortfolioCandidateInput,
  candidates: RecommendationPortfolioCandidateInput[],
): RecommendationPortfolioClass[] {
  const classes: RecommendationPortfolioClass[] = [];
  // Under locked DIQ-203 rules, urgency 100 is a critical pattern and urgency
  // 90 is the exact derived signal for a priority-opportunity score below 25.
  if (["critical", "high"].includes(candidate.priorityLabel) && candidate.urgency >= 90) {
    classes.push("immediate_attention");
  }
  if (
    candidates.some(
      (dependant) =>
        dependant.recommendationId !== candidate.recommendationId &&
        dependant.dependencies.some(
          (dependency) => dependency.recommendationId === candidate.recommendationId,
        ),
    )
  ) {
    classes.push("foundation");
  }
  const requiredDependenciesReady = candidate.dependencies
    .filter((dependency) => dependency.type === "required")
    .every((dependency) => dependency.state === "available");
  if (
    candidate.effort === "low" &&
    requiredDependenciesReady &&
    ["medium", "high"].includes(candidate.impact)
  ) {
    classes.push("quick_win");
  }
  if (candidate.effort === "high" || candidate.generatedHorizon === "day90") {
    classes.push("strategic_initiative");
  }
  if (!classes.length) classes.push("watch");
  return classes;
}

function candidateOrder(
  left: RecommendationPortfolioCandidateInput,
  right: RecommendationPortfolioCandidateInput,
) {
  return (
    (left.generatedSequence ?? Number.MAX_SAFE_INTEGER) -
      (right.generatedSequence ?? Number.MAX_SAFE_INTEGER) ||
    left.generatedRank - right.generatedRank ||
    left.catalogueOrder - right.catalogueOrder ||
    left.recommendationId.localeCompare(right.recommendationId)
  );
}

export function buildRecommendationPortfolio(input: {
  candidates: RecommendationPortfolioCandidateInput[];
}): RecommendationPortfolioOutput {
  if (input.candidates.length > 250) {
    throw new RecommendationPortfolioError("Recommendation portfolios are limited to 250 items");
  }
  const ids = input.candidates.map((candidate) => candidate.recommendationId);
  const priorityIds = input.candidates.map((candidate) => candidate.priorityItemId);
  const sequenceIds = input.candidates.map((candidate) => candidate.sequenceItemId);
  if (
    new Set(ids).size !== ids.length ||
    new Set(priorityIds).size !== priorityIds.length ||
    new Set(sequenceIds).size !== sequenceIds.length
  ) {
    throw new RecommendationPortfolioError("Portfolio candidates must be unique");
  }
  input.candidates.forEach(validateCandidate);

  const candidates = [...input.candidates].sort(candidateOrder);
  const classified = candidates.map((candidate) => {
    const classes = matchedClasses(candidate, candidates);
    return {
      ...candidate,
      portfolioOrder: 0,
      primaryClass: classes[0],
      secondaryTags: classes.slice(1),
    };
  });
  const items = classified
    .sort(
      (left, right) =>
        recommendationPortfolioClasses.indexOf(left.primaryClass) -
          recommendationPortfolioClasses.indexOf(right.primaryClass) || candidateOrder(left, right),
    )
    .map((item, index) => ({ ...item, portfolioOrder: index + 1 }));
  const scheduledCount = items.filter((item) => item.sequenceState === "scheduled").length;
  const blockedCount = items.filter((item) => item.sequenceState === "blocked_dependency").length;
  const capacityExceededCount = items.filter(
    (item) => item.sequenceState === "capacity_exceeded",
  ).length;
  const state: RecommendationPortfolioState = !items.length
    ? "empty"
    : scheduledCount === items.length
      ? "complete"
      : "partial";
  const classCounts = Object.fromEntries(
    recommendationPortfolioClasses.map((portfolioClass) => [
      portfolioClass,
      items.filter((item) => item.primaryClass === portfolioClass).length,
    ]),
  ) as Record<RecommendationPortfolioClass, number>;

  return {
    schemaVersion: "deliveryiq.recommendation-portfolio/1.0.0",
    policyVersion: RECOMMENDATION_PORTFOLIO_POLICY_VERSION,
    projectorVersion: RECOMMENDATION_PORTFOLIO_PROJECTOR_VERSION,
    summary: {
      state,
      itemCount: items.length,
      scheduledCount,
      blockedCount,
      capacityExceededCount,
      classCounts,
    },
    items,
  };
}
