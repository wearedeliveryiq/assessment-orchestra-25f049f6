import {
  validateCatalogueSnapshot,
  CatalogueValidationError,
} from "../recommendation-catalogue/catalogue";
import type { CatalogueDefinition, CatalogueSnapshot } from "../recommendation-catalogue/types";

export const RECOMMENDATION_RESOLUTION_POLICY_VERSION = "PB-004/S4-004/1.0.0";
export const RECOMMENDATION_RESOLVER_VERSION = "deliveryiq.recommendation-resolver/1.0.0";

export type RecommendationResolutionResult = "canonical" | "suppressed";
export type RecommendationResolutionReason =
  "retained" | "mutual_exclusion" | "superseded" | "deduplicated";

export interface RecommendationResolutionCandidateInput {
  candidateConfidenceGateId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  postConfidenceResult: "presented" | "evidence_first";
  sourceTraceNodeIds: string[];
}

export interface RecommendationResolutionCandidate {
  candidateConfidenceGateId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  postConfidenceResult: "presented" | "evidence_first";
  resolutionResult: RecommendationResolutionResult;
  reasonCode: RecommendationResolutionReason;
  winnerRecommendationId: string | null;
  winnerRecommendationVersion: string | null;
  sourceCandidateGateIds: string[];
  sourceTraceNodeIds: string[];
}

export interface RecommendationResolutionOutput {
  schemaVersion: "deliveryiq.recommendation-resolution/1.0.0";
  policyVersion: string;
  resolverVersion: string;
  candidates: RecommendationResolutionCandidate[];
}

export class RecommendationResolutionError extends Error {
  readonly code = "RECOMMENDATION_RESOLUTION_INVALID";
}

function candidateOrder(
  left: RecommendationResolutionCandidateInput,
  right: RecommendationResolutionCandidateInput,
) {
  return (
    left.catalogueOrder - right.catalogueOrder ||
    left.recommendationId.localeCompare(right.recommendationId)
  );
}

function conflictOrder(
  left: RecommendationResolutionCandidateInput,
  right: RecommendationResolutionCandidateInput,
  definitions: Map<string, CatalogueDefinition>,
) {
  const leftPriority = definitions.get(left.recommendationId)?.conflictPriority ?? 0;
  const rightPriority = definitions.get(right.recommendationId)?.conflictPriority ?? 0;
  return rightPriority - leftPriority || candidateOrder(left, right);
}

export function resolveRecommendationConflicts(input: {
  snapshot: CatalogueSnapshot;
  candidates: RecommendationResolutionCandidateInput[];
}): RecommendationResolutionOutput {
  let snapshot: CatalogueSnapshot;
  try {
    snapshot = validateCatalogueSnapshot(input.snapshot);
  } catch (error) {
    if (error instanceof CatalogueValidationError) {
      throw new RecommendationResolutionError(error.message);
    }
    throw error;
  }

  const definitions = new Map(snapshot.definitions.map((item) => [item.id, item]));
  const candidates = [...input.candidates].sort(candidateOrder);
  if (new Set(candidates.map((item) => item.recommendationId)).size !== candidates.length) {
    throw new RecommendationResolutionError("Resolution candidates must be unique");
  }
  for (const candidate of candidates) {
    const definition = definitions.get(candidate.recommendationId);
    if (
      !definition ||
      definition.version !== candidate.recommendationVersion ||
      definition.order !== candidate.catalogueOrder ||
      !["presented", "evidence_first"].includes(candidate.postConfidenceResult) ||
      new Set(candidate.sourceTraceNodeIds).size !== candidate.sourceTraceNodeIds.length
    ) {
      throw new RecommendationResolutionError(
        `Candidate ${candidate.recommendationId} does not match the pinned catalogue`,
      );
    }
  }

  const byId = new Map(candidates.map((item) => [item.recommendationId, item]));
  const suppressed = new Map<
    string,
    { reason: Exclude<RecommendationResolutionReason, "retained">; winnerId: string }
  >();
  const suppress = (
    loserId: string,
    winnerId: string,
    reason: Exclude<RecommendationResolutionReason, "retained">,
  ) => {
    if (loserId === winnerId || suppressed.has(loserId)) return;
    const winner = definitions.get(winnerId);
    if (!winner || winner.dependencies.includes(loserId)) {
      throw new RecommendationResolutionError(
        `${winnerId} cannot suppress required dependency ${loserId}`,
      );
    }
    suppressed.set(loserId, { reason, winnerId });
  };

  for (const winner of [...candidates].sort((left, right) =>
    conflictOrder(left, right, definitions),
  )) {
    if (suppressed.has(winner.recommendationId)) continue;
    const conflicts = definitions.get(winner.recommendationId)?.conflicts ?? [];
    for (const loserId of conflicts) {
      if (byId.has(loserId) && !suppressed.has(loserId)) {
        suppress(loserId, winner.recommendationId, "mutual_exclusion");
      }
    }
  }

  const supersessionParticipants = candidates.filter(
    (candidate) => !suppressed.has(candidate.recommendationId),
  );
  const supersederByTarget = new Map<string, string>();
  for (const source of supersessionParticipants) {
    for (const target of definitions.get(source.recommendationId)?.supersedes ?? []) {
      const targetCandidate = byId.get(target.id);
      if (
        targetCandidate &&
        !suppressed.has(target.id) &&
        targetCandidate.recommendationVersion === target.version
      ) {
        supersederByTarget.set(target.id, source.recommendationId);
      }
    }
  }
  const suppressSupersessionDescendants = (sourceId: string) => {
    for (const target of definitions.get(sourceId)?.supersedes ?? []) {
      if (!supersederByTarget.has(target.id)) continue;
      suppress(target.id, sourceId, "superseded");
      suppressSupersessionDescendants(target.id);
    }
  };
  for (const root of supersessionParticipants.filter(
    (candidate) => !supersederByTarget.has(candidate.recommendationId),
  )) {
    suppressSupersessionDescendants(root.recommendationId);
  }

  const dedupeMembers = new Map<string, string[]>();
  const active = candidates.filter((item) => !suppressed.has(item.recommendationId));
  const groups = new Map<string, RecommendationResolutionCandidateInput[]>();
  for (const candidate of active) {
    const group = definitions.get(candidate.recommendationId)!.dedupeGroup;
    groups.set(group, [...(groups.get(group) ?? []), candidate]);
  }
  for (const [group, members] of groups) {
    if (members.length < 2) continue;
    const configuredCanonical = snapshot.definitions
      .filter((item) => item.dedupeGroup === group && item.canonicalRecommendation)
      .map((item) => item.canonicalRecommendation!)[0];
    const canonical = configuredCanonical
      ? members.find(
          (item) =>
            item.recommendationId === configuredCanonical.id &&
            item.recommendationVersion === configuredCanonical.version,
        )
      : [...members].sort(candidateOrder)[0];
    if (!canonical) {
      throw new RecommendationResolutionError(`${group} configured canonical is unavailable`);
    }
    const merged = [canonical.candidateConfidenceGateId];
    for (const member of [...members].sort(candidateOrder)) {
      if (member.recommendationId === canonical.recommendationId) continue;
      suppress(member.recommendationId, canonical.recommendationId, "deduplicated");
      merged.push(member.candidateConfidenceGateId);
    }
    dedupeMembers.set(canonical.recommendationId, merged.sort());
  }

  return {
    schemaVersion: "deliveryiq.recommendation-resolution/1.0.0",
    policyVersion: RECOMMENDATION_RESOLUTION_POLICY_VERSION,
    resolverVersion: RECOMMENDATION_RESOLVER_VERSION,
    candidates: candidates.map((candidate) => {
      const outcome = suppressed.get(candidate.recommendationId);
      const deduplicatedCandidateIds = dedupeMembers.get(candidate.recommendationId) ?? [
        candidate.candidateConfidenceGateId,
      ];
      const deduplicatedTraces = candidates
        .filter((item) => deduplicatedCandidateIds.includes(item.candidateConfidenceGateId))
        .flatMap((item) => item.sourceTraceNodeIds);
      const winner = outcome ? byId.get(outcome.winnerId) : null;
      return {
        ...candidate,
        resolutionResult: outcome ? ("suppressed" as const) : ("canonical" as const),
        reasonCode: outcome?.reason ?? ("retained" as const),
        winnerRecommendationId: winner?.recommendationId ?? null,
        winnerRecommendationVersion: winner?.recommendationVersion ?? null,
        sourceCandidateGateIds: outcome
          ? [candidate.candidateConfidenceGateId]
          : deduplicatedCandidateIds,
        sourceTraceNodeIds: [
          ...new Set(outcome ? candidate.sourceTraceNodeIds : deduplicatedTraces),
        ].sort(),
      };
    }),
  };
}
