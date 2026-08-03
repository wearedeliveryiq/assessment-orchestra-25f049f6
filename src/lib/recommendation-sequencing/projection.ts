import { applySequenceOverride } from "./model";
import type { RecommendationSequenceRecord } from "./types";

export type RecommendationSequenceAudience = "public" | "workspace" | "audit";

export function projectRecommendationSequence(
  record: RecommendationSequenceRecord,
  audience: RecommendationSequenceAudience,
) {
  const ordered = applySequenceOverride(
    record.items,
    record.dependencies,
    record.override?.orderedRecommendationIds ?? null,
  );
  if (audience === "public") {
    return { recommendationCount: ordered.length };
  }
  const dependenciesByRecommendation = new Map(
    ordered.map((item) => [
      item.recommendationId,
      record.dependencies
        .filter((dependency) => dependency.dependantRecommendationId === item.recommendationId)
        .map((dependency) => ({
          recommendationId: dependency.resolvedDependencyId ?? dependency.sourceDependencyId,
          type: dependency.dependencyType,
          state: dependency.state,
          reason: dependency.reasonCode,
        })),
    ]),
  );
  const base = {
    sequenceModelId: record.id,
    analysisRunId: record.analysisRunId,
    generatedAt: record.createdAt,
    policyVersion: record.policyVersion,
    orderSource: record.override ? ("customer_override" as const) : ("generated" as const),
    overrideVersion: record.override?.version ?? 0,
    capacity: record.canonicalSequence.capacity,
    recommendations: ordered.map((item) => ({
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      generatedRank: item.generatedRank,
      generatedSequence: item.generatedSequence,
      customerSequence: item.customerSequence,
      generatedHorizon: item.generatedHorizon,
      state: item.sequenceState,
      reason: item.reasonCode,
      blockingDependencyIds: item.blockingDependencyIds,
      dependencies: dependenciesByRecommendation.get(item.recommendationId) ?? [],
      caveats: item.caveats,
    })),
  };
  if (audience === "workspace") return base;
  return {
    ...base,
    priorityModelId: record.priorityModelId,
    conflictResolutionId: record.conflictResolutionId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    configurationSetId: record.configurationSetId,
    catalogueVersionId: record.catalogueVersionId,
    catalogueDigest: record.catalogueDigest,
    engineVersion: record.engineVersion,
    inputHash: record.inputHash,
    outputHash: record.outputHash,
    override: record.override
      ? {
          id: record.override.id,
          version: record.override.version,
          previousOverrideId: record.override.previousOverrideId,
          reason: record.override.reason,
          acknowledgedRisk: record.override.acknowledgedRisk,
          dependencyRisks: record.override.dependencyRisks,
          actorUserId: record.override.actorUserId,
          createdAt: record.override.createdAt,
        }
      : null,
    recommendations: ordered.map((item) => ({
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      priorityItemId: item.priorityItemId,
      generatedRank: item.generatedRank,
      generatedSequence: item.generatedSequence,
      customerSequence: item.customerSequence,
      generatedHorizon: item.generatedHorizon,
      state: item.sequenceState,
      reason: item.reasonCode,
      blockingDependencyIds: item.blockingDependencyIds,
      dependencies: record.dependencies.filter(
        (dependency) => dependency.dependantRecommendationId === item.recommendationId,
      ),
      caveats: item.caveats,
      sourceTraceNodeIds: item.sourceTraceNodeIds,
      semanticHash: item.semanticHash,
    })),
  };
}
