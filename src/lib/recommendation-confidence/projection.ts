import type { RecommendationConfidenceGateRecord } from "./types";

export type RecommendationConfidenceAudience = "public" | "workspace" | "audit";

function confidence(record: RecommendationConfidenceGateRecord) {
  return {
    state: record.confidenceState,
    caveat: record.caveat,
    version: record.confidenceVersion,
  };
}

export function projectRecommendationConfidenceGate(
  record: RecommendationConfidenceGateRecord,
  audience: RecommendationConfidenceAudience,
) {
  const visible = record.candidates.filter((candidate) => candidate.postGateResult !== "withheld");
  const withheld = record.candidates.filter((candidate) => candidate.postGateResult === "withheld");
  if (audience === "public") {
    return {
      confidence: confidence(record),
      presentedCount: visible.filter((candidate) => candidate.postGateResult === "presented")
        .length,
      evidenceFirstAvailable: visible.some(
        (candidate) => candidate.postGateResult === "evidence_first",
      ),
      withheld: {
        count: withheld.length,
        reasonCode: withheld.length ? "low_confidence_material_action" : null,
      },
    };
  }
  if (audience === "workspace") {
    return {
      gateId: record.id,
      analysisRunId: record.analysisRunId,
      generatedAt: record.createdAt,
      policyVersion: record.policyVersion,
      confidence: confidence(record),
      recommendations: visible.map((candidate) => ({
        recommendationId: candidate.recommendationId,
        recommendationVersion: candidate.recommendationVersion,
        state: candidate.postGateResult,
        reasonCode: candidate.reasonCode,
        caveat: candidate.caveat,
      })),
      withheld: {
        count: withheld.length,
        reasonCode: withheld.length ? "low_confidence_material_action" : null,
        caveat: withheld.length ? record.caveat : null,
      },
    };
  }
  return {
    gateId: record.id,
    recommendationEvaluationId: record.recommendationEvaluationId,
    analysisRunId: record.analysisRunId,
    intelligenceResultId: record.intelligenceResultId,
    organisationId: record.organisationId,
    workspaceId: record.workspaceId,
    configurationSetId: record.configurationSetId,
    catalogueVersionId: record.catalogueVersionId,
    catalogueDigest: record.catalogueDigest,
    generatedAt: record.createdAt,
    policyVersion: record.policyVersion,
    gateEngineVersion: record.gateEngineVersion,
    confidence: {
      ...confidence(record),
      index: record.confidenceIndex,
      limitationCodes: record.limitationCodes,
      traceNodeId: record.confidenceTraceNodeId,
    },
    candidates: record.candidates.map((candidate) => ({
      recommendationId: candidate.recommendationId,
      recommendationVersion: candidate.recommendationVersion,
      catalogueOrder: candidate.catalogueOrder,
      effort: candidate.effort,
      preGateResult: candidate.preGateResult,
      postGateResult: candidate.postGateResult,
      reasonCode: candidate.reasonCode,
      caveat: candidate.caveat,
      limitationCodes: candidate.limitationCodes,
      semanticHash: candidate.semanticHash,
      traceIds: candidate.sourceTraceNodeIds,
    })),
  };
}
