import {
  buildRoadmap,
  RoadmapError,
  topologicalRoadmapOrder,
} from "../delivery-intelligence/roadmap";
import { sprint03Configuration } from "../delivery-intelligence/config";

export const RECOMMENDATION_SEQUENCE_POLICY_VERSION = "PB-004/S4-006/1.0.0";
export const RECOMMENDATION_SEQUENCE_ENGINE_VERSION = "deliveryiq.recommendation-sequencing/1.0.0";

export type RecommendationDependencyType = "required" | "recommended";
export type RecommendationDependencyResolution =
  "direct" | "superseded" | "deduplicated" | "unavailable";
export type RecommendationDependencyState = "available" | "blocked" | "unavailable";
export type RecommendationSequenceHorizon = "day30" | "day60" | "day90";
export type RecommendationSequenceState = "scheduled" | "blocked_dependency" | "capacity_exceeded";

export interface RecommendationDependencyInput {
  sourceDependencyId: string;
  resolvedDependencyId: string | null;
  dependencyType: RecommendationDependencyType;
  resolution: RecommendationDependencyResolution;
}

export interface RecommendationSequenceCandidateInput {
  priorityItemId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  generatedRank: number;
  effort: "low" | "medium" | "high";
  sourceTraceNodeIds: string[];
  dependencies: RecommendationDependencyInput[];
}

export interface RecommendationSequenceDependency {
  dependantRecommendationId: string;
  sourceDependencyId: string;
  resolvedDependencyId: string | null;
  dependencyType: RecommendationDependencyType;
  resolution: RecommendationDependencyResolution;
  state: RecommendationDependencyState;
  reasonCode:
    | "dependency_available"
    | "dependency_superseded"
    | "dependency_deduplicated"
    | "dependency_unavailable"
    | "dependency_blocked";
}

export interface RecommendationSequenceCaveat {
  code: "recommended_dependency_unavailable" | "recommended_dependency_blocked";
  message: string;
  dependencyId: string;
}

export interface RecommendationSequenceItem {
  priorityItemId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  generatedRank: number;
  generatedSequence: number | null;
  generatedHorizon: RecommendationSequenceHorizon | null;
  effort: "low" | "medium" | "high";
  sequenceState: RecommendationSequenceState;
  reasonCode:
    | "dependency_precedence"
    | "dependency_satisfied"
    | "rank_and_horizon_fit"
    | "blocked_dependency"
    | "capacity_exceeded";
  blockingDependencyIds: string[];
  caveats: RecommendationSequenceCaveat[];
  sourceTraceNodeIds: string[];
}

export interface RecommendationSequenceOutput {
  schemaVersion: "deliveryiq.recommendation-sequencing/1.0.0";
  policyVersion: string;
  engineVersion: string;
  capacity: { day30: number; day60: number; day90: number };
  items: RecommendationSequenceItem[];
  dependencies: RecommendationSequenceDependency[];
}

export class RecommendationSequenceError extends Error {
  readonly code: string = "RECOMMENDATION_SEQUENCE_INVALID";
}

export class RecommendationSequenceCycleError extends RecommendationSequenceError {
  override readonly code = "ROADMAP_DEPENDENCY_CYCLE";

  constructor(readonly cycle: string[]) {
    super("The recommendation dependency graph contains a cycle.");
  }
}

const capacity = sprint03Configuration.roadmap.capacity;

function sortedCandidates(candidates: RecommendationSequenceCandidateInput[]) {
  return [...candidates].sort(
    (left, right) =>
      left.generatedRank - right.generatedRank ||
      left.catalogueOrder - right.catalogueOrder ||
      left.recommendationId.localeCompare(right.recommendationId),
  );
}

function assertInput(candidates: RecommendationSequenceCandidateInput[]) {
  const dependencyCount = candidates.reduce((count, item) => count + item.dependencies.length, 0);
  if (candidates.length > 250 || dependencyCount > 1_000) {
    throw new RecommendationSequenceError(
      "Recommendation sequencing is limited to 250 recommendations and 1,000 dependencies",
    );
  }
  const ids = candidates.map((item) => item.recommendationId);
  const ranks = candidates.map((item) => item.generatedRank);
  if (new Set(ids).size !== ids.length || new Set(ranks).size !== ranks.length) {
    throw new RecommendationSequenceError("Sequence candidates and generated ranks must be unique");
  }
  for (const candidate of candidates) {
    if (
      !candidate.recommendationId ||
      !candidate.priorityItemId ||
      !Number.isInteger(candidate.generatedRank) ||
      candidate.generatedRank < 1 ||
      new Set(candidate.sourceTraceNodeIds).size !== candidate.sourceTraceNodeIds.length
    ) {
      throw new RecommendationSequenceError(
        `Sequence candidate ${candidate.recommendationId} is invalid`,
      );
    }
    const dependencyKeys = candidate.dependencies.map(
      (dependency) => `${dependency.sourceDependencyId}:${dependency.dependencyType}`,
    );
    if (
      new Set(dependencyKeys).size !== dependencyKeys.length ||
      candidate.dependencies.some(
        (dependency) =>
          !dependency.sourceDependencyId ||
          !["required", "recommended"].includes(dependency.dependencyType) ||
          !["direct", "superseded", "deduplicated", "unavailable"].includes(
            dependency.resolution,
          ) ||
          dependency.resolvedDependencyId === candidate.recommendationId,
      )
    ) {
      throw new RecommendationSequenceError(
        `Dependencies for ${candidate.recommendationId} are invalid`,
      );
    }
  }
}

function dependencyReason(
  dependency: RecommendationDependencyInput,
  state: RecommendationDependencyState,
): RecommendationSequenceDependency["reasonCode"] {
  if (state === "blocked") return "dependency_blocked";
  if (state === "unavailable") return "dependency_unavailable";
  if (dependency.resolution === "superseded") return "dependency_superseded";
  if (dependency.resolution === "deduplicated") return "dependency_deduplicated";
  return "dependency_available";
}

function cycleCheck(candidates: RecommendationSequenceCandidateInput[]) {
  const known = new Set(candidates.map((item) => item.recommendationId));
  try {
    topologicalRoadmapOrder({
      ranked: sortedCandidates(candidates).map((item) => item.recommendationId),
      effort: Object.fromEntries(candidates.map((item) => [item.recommendationId, item.effort])),
      dependencies: Object.fromEntries(
        candidates.map((item) => [
          item.recommendationId,
          item.dependencies
            .map((dependency) => dependency.resolvedDependencyId)
            .filter((id): id is string => Boolean(id && known.has(id))),
        ]),
      ),
    });
  } catch (error) {
    if (error instanceof RoadmapError) throw new RecommendationSequenceCycleError(error.cycle);
    throw error;
  }
}

export function buildRecommendationSequence(input: {
  candidates: RecommendationSequenceCandidateInput[];
}): RecommendationSequenceOutput {
  assertInput(input.candidates);
  cycleCheck(input.candidates);
  const candidates = sortedCandidates(input.candidates);
  const byId = new Map(candidates.map((item) => [item.recommendationId, item]));
  const blocked = new Map<string, Set<string>>();

  for (const candidate of candidates) {
    for (const dependency of candidate.dependencies.filter(
      (item) => item.dependencyType === "required",
    )) {
      if (!dependency.resolvedDependencyId || !byId.has(dependency.resolvedDependencyId)) {
        blocked.set(
          candidate.recommendationId,
          new Set([
            ...(blocked.get(candidate.recommendationId) ?? []),
            dependency.sourceDependencyId,
          ]),
        );
      }
    }
  }

  const propagateBlocked = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of candidates) {
        for (const dependency of candidate.dependencies.filter(
          (item) => item.dependencyType === "required" && item.resolvedDependencyId,
        )) {
          if (
            blocked.has(dependency.resolvedDependencyId!) &&
            !blocked.has(candidate.recommendationId)
          ) {
            blocked.set(candidate.recommendationId, new Set([dependency.sourceDependencyId]));
            changed = true;
          } else if (blocked.has(dependency.resolvedDependencyId!)) {
            const reasons = blocked.get(candidate.recommendationId)!;
            const before = reasons.size;
            reasons.add(dependency.sourceDependencyId);
            if (reasons.size !== before) changed = true;
          }
        }
      }
    }
  };
  propagateBlocked();

  let roadmap: {
    day30: Array<{ id: string; reason: string }>;
    day60: Array<{ id: string; reason: string }>;
    day90: Array<{ id: string; reason: string }>;
    unscheduled: Array<{ id: string; reason: string }>;
  };
  const ignoredRecommendedDependencies = new Set<string>();
  while (true) {
    const schedulable = candidates.filter((item) => !blocked.has(item.recommendationId));
    const schedulableIds = new Set(schedulable.map((item) => item.recommendationId));
    const candidateRoadmap = buildRoadmap({
      ranked: schedulable.map((item) => item.recommendationId),
      effort: Object.fromEntries(schedulable.map((item) => [item.recommendationId, item.effort])),
      dependencies: Object.fromEntries(
        schedulable.map((item) => [
          item.recommendationId,
          item.dependencies
            .filter(
              (dependency) =>
                dependency.dependencyType === "required" ||
                !ignoredRecommendedDependencies.has(
                  `${item.recommendationId}:${dependency.sourceDependencyId}`,
                ),
            )
            .map((dependency) => dependency.resolvedDependencyId)
            .filter((id): id is string => Boolean(id && schedulableIds.has(id))),
        ]),
      ),
    });
    if (!candidateRoadmap.published) {
      throw new RecommendationSequenceCycleError(candidateRoadmap.error.cycle);
    }
    const placed = new Set(
      [...candidateRoadmap.day30, ...candidateRoadmap.day60, ...candidateRoadmap.day90].map(
        (item) => item.id,
      ),
    );
    let recommendedCapacityCaveat = false;
    for (const candidate of candidates) {
      if (blocked.has(candidate.recommendationId)) continue;
      for (const dependency of candidate.dependencies.filter(
        (item) => item.dependencyType === "recommended" && item.resolvedDependencyId,
      )) {
        const key = `${candidate.recommendationId}:${dependency.sourceDependencyId}`;
        if (
          !placed.has(dependency.resolvedDependencyId!) &&
          !ignoredRecommendedDependencies.has(key)
        ) {
          ignoredRecommendedDependencies.add(key);
          recommendedCapacityCaveat = true;
        }
      }
    }
    if (recommendedCapacityCaveat) continue;
    let requiredCapacityBlock = false;
    for (const candidate of candidates) {
      if (blocked.has(candidate.recommendationId)) continue;
      for (const dependency of candidate.dependencies.filter(
        (item) => item.dependencyType === "required" && item.resolvedDependencyId,
      )) {
        if (!placed.has(dependency.resolvedDependencyId!)) {
          blocked.set(candidate.recommendationId, new Set([dependency.sourceDependencyId]));
          requiredCapacityBlock = true;
        }
      }
    }
    if (requiredCapacityBlock) {
      propagateBlocked();
      continue;
    }
    roadmap = candidateRoadmap;
    break;
  }

  const scheduled = new Map<
    string,
    {
      sequence: number;
      horizon: RecommendationSequenceHorizon;
      reason: RecommendationSequenceItem["reasonCode"];
    }
  >();
  let sequence = 0;
  for (const [horizon, items] of [
    ["day30", roadmap.day30],
    ["day60", roadmap.day60],
    ["day90", roadmap.day90],
  ] as const) {
    for (const item of items) {
      sequence += 1;
      scheduled.set(item.id, {
        sequence,
        horizon,
        reason: item.reason as RecommendationSequenceItem["reasonCode"],
      });
    }
  }
  const capacityExceeded = new Set(
    roadmap.unscheduled
      .filter((item) => item.reason === "capacity_exceeded")
      .map((item) => item.id),
  );

  const dependencies: RecommendationSequenceDependency[] = candidates.flatMap((candidate) =>
    candidate.dependencies.map((dependency) => {
      const target = dependency.resolvedDependencyId
        ? byId.get(dependency.resolvedDependencyId)
        : undefined;
      const state: RecommendationDependencyState = !target
        ? "unavailable"
        : blocked.has(target.recommendationId) || capacityExceeded.has(target.recommendationId)
          ? "blocked"
          : "available";
      return {
        dependantRecommendationId: candidate.recommendationId,
        ...dependency,
        state,
        reasonCode: dependencyReason(dependency, state),
      };
    }),
  );

  const items = candidates.map((candidate): RecommendationSequenceItem => {
    const placement = scheduled.get(candidate.recommendationId);
    const blockedBy = [...(blocked.get(candidate.recommendationId) ?? [])].sort();
    const caveats = candidate.dependencies
      .filter((dependency) => dependency.dependencyType === "recommended")
      .flatMap((dependency): RecommendationSequenceCaveat[] => {
        const target = dependency.resolvedDependencyId
          ? byId.get(dependency.resolvedDependencyId)
          : undefined;
        if (!target) {
          return [
            {
              code: "recommended_dependency_unavailable",
              dependencyId: dependency.sourceDependencyId,
              message:
                "A recommended dependency is not currently available; review the sequence before starting.",
            },
          ];
        }
        if (blocked.has(target.recommendationId) || capacityExceeded.has(target.recommendationId)) {
          return [
            {
              code: "recommended_dependency_blocked",
              dependencyId: dependency.sourceDependencyId,
              message:
                "A recommended dependency is currently blocked; review the sequence before starting.",
            },
          ];
        }
        return [];
      });
    if (blockedBy.length) {
      return {
        ...candidate,
        generatedSequence: null,
        generatedHorizon: null,
        sequenceState: "blocked_dependency",
        reasonCode: "blocked_dependency",
        blockingDependencyIds: blockedBy,
        caveats,
      };
    }
    if (capacityExceeded.has(candidate.recommendationId) || !placement) {
      return {
        ...candidate,
        generatedSequence: null,
        generatedHorizon: null,
        sequenceState: "capacity_exceeded",
        reasonCode: "capacity_exceeded",
        blockingDependencyIds: [],
        caveats,
      };
    }
    return {
      ...candidate,
      generatedSequence: placement.sequence,
      generatedHorizon: placement.horizon,
      sequenceState: "scheduled",
      reasonCode: placement.reason,
      blockingDependencyIds: [],
      caveats,
    };
  });

  return {
    schemaVersion: "deliveryiq.recommendation-sequencing/1.0.0",
    policyVersion: RECOMMENDATION_SEQUENCE_POLICY_VERSION,
    engineVersion: RECOMMENDATION_SEQUENCE_ENGINE_VERSION,
    capacity: { ...capacity },
    items,
    dependencies,
  };
}

export function sequenceOverrideRisks(
  items: RecommendationSequenceItem[],
  dependencies: RecommendationSequenceDependency[],
  orderedRecommendationIds: string[],
) {
  const scheduled = items
    .filter((item) => item.sequenceState === "scheduled")
    .map((item) => item.recommendationId);
  if (
    orderedRecommendationIds.length !== scheduled.length ||
    new Set(orderedRecommendationIds).size !== scheduled.length ||
    orderedRecommendationIds.some((id) => !scheduled.includes(id))
  ) {
    throw new RecommendationSequenceError(
      "A sequence override must contain every scheduled recommendation exactly once",
    );
  }
  const position = new Map(orderedRecommendationIds.map((id, index) => [id, index]));
  return dependencies
    .filter(
      (dependency) =>
        dependency.resolvedDependencyId &&
        position.has(dependency.dependantRecommendationId) &&
        position.has(dependency.resolvedDependencyId) &&
        position.get(dependency.resolvedDependencyId)! >
          position.get(dependency.dependantRecommendationId)!,
    )
    .map((dependency) => ({
      dependantRecommendationId: dependency.dependantRecommendationId,
      dependencyRecommendationId: dependency.resolvedDependencyId!,
      dependencyType: dependency.dependencyType,
    }))
    .sort(
      (left, right) =>
        left.dependantRecommendationId.localeCompare(right.dependantRecommendationId) ||
        left.dependencyRecommendationId.localeCompare(right.dependencyRecommendationId),
    );
}

export function applySequenceOverride<T extends RecommendationSequenceItem>(
  items: T[],
  dependencies: RecommendationSequenceDependency[],
  orderedRecommendationIds: string[] | null,
) {
  const generated = [...items].sort(
    (left, right) =>
      (left.generatedSequence ?? Number.MAX_SAFE_INTEGER) -
        (right.generatedSequence ?? Number.MAX_SAFE_INTEGER) ||
      left.generatedRank - right.generatedRank,
  );
  if (!orderedRecommendationIds) {
    return generated.map((item) => ({
      ...item,
      customerSequence: item.generatedSequence,
    }));
  }
  sequenceOverrideRisks(items, dependencies, orderedRecommendationIds);
  const customerPosition = new Map(orderedRecommendationIds.map((id, index) => [id, index + 1]));
  return generated.map((item) => ({
    ...item,
    customerSequence: customerPosition.get(item.recommendationId) ?? null,
  }));
}
