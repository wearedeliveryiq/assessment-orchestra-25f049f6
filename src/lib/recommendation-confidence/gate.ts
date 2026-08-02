import { sprint03Configuration } from "../delivery-intelligence/config";
import {
  confidenceLimitationDefinitions,
  type ConfidenceLimitationDefinition,
} from "../delivery-intelligence/confidence";
import type { CatalogueDefinition } from "../recommendation-catalogue/types";
import { recommendationConfidenceState } from "../recommendations/eligibility";

export const RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION = "PB-004/S4-003/1.0.0";
export const RECOMMENDATION_CONFIDENCE_VERSION = "DIQ-203A/confidence/1.0.0";
export const RECOMMENDATION_CONFIDENCE_GATE_ENGINE_VERSION =
  "deliveryiq.recommendation-confidence-gate/1.0.0";

export type RecommendationConfidenceGateResult = "presented" | "withheld" | "evidence_first";
export type RecommendationConfidenceGateReason =
  | "confidence_high"
  | "confidence_moderate"
  | "low_confidence_low_effort"
  | "low_confidence_material_action"
  | "low_confidence_evidence_first";

export interface RecommendationConfidenceGateCandidate {
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  effort: "low" | "medium" | "high";
  preGateResult: "eligible";
  postGateResult: RecommendationConfidenceGateResult;
  reasonCode: RecommendationConfidenceGateReason;
  confidenceState: "low" | "moderate" | "high";
  caveat: string | null;
  limitationCodes: string[];
  sourceTraceNodeIds: string[];
}

export interface RecommendationConfidenceGateOutput {
  schemaVersion: "deliveryiq.recommendation-confidence-gate/1.0.0";
  policyVersion: string;
  confidenceVersion: string;
  gateEngineVersion: string;
  confidence: {
    index: number;
    state: "low" | "moderate" | "high";
    caveat: string | null;
    limitationCodes: string[];
  };
  candidates: RecommendationConfidenceGateCandidate[];
}

export class RecommendationConfidenceGateError extends Error {
  readonly code = "RECOMMENDATION_EVALUATION_INVALID";
}

const LIMITATIONS = confidenceLimitationDefinitions();

const LIMITATION_BY_CODE = new Map(LIMITATIONS.map((item) => [item.code, item]));

export function confidenceLimitations(codes: readonly string[]) {
  if (new Set(codes).size !== codes.length) {
    throw new RecommendationConfidenceGateError("Duplicate confidence limitation");
  }
  return codes
    .map((code) => {
      const limitation = LIMITATION_BY_CODE.get(code);
      if (!limitation) {
        throw new RecommendationConfidenceGateError(`Unknown confidence limitation: ${code}`);
      }
      return limitation;
    })
    .sort((left, right) => left.order - right.order);
}

function caveatFor(
  confidenceState: "low" | "moderate" | "high",
  limitations: ConfidenceLimitationDefinition[],
) {
  if (confidenceState === "high") return null;
  if (confidenceState === "low") {
    return sprint03Configuration.narrative.templates.lowConfidenceCaveat;
  }
  if (!limitations.length) {
    throw new RecommendationConfidenceGateError(
      "Moderate confidence requires an approved evidence limitation",
    );
  }
  return limitations.map((item) => item.text).join(" ");
}

function gateResult(
  definition: CatalogueDefinition,
  confidenceState: "low" | "moderate" | "high",
): Pick<RecommendationConfidenceGateCandidate, "postGateResult" | "reasonCode"> {
  if (confidenceState === "high") {
    return { postGateResult: "presented", reasonCode: "confidence_high" };
  }
  if (confidenceState === "moderate") {
    return { postGateResult: "presented", reasonCode: "confidence_moderate" };
  }
  const evidenceFirst = definition.triggers.any.some(
    (trigger) => trigger.analysisConfidence === "low",
  );
  if (evidenceFirst) {
    if (definition.effort !== "low") {
      throw new RecommendationConfidenceGateError(
        "The approved evidence-first recommendation must remain low effort",
      );
    }
    return { postGateResult: "evidence_first", reasonCode: "low_confidence_evidence_first" };
  }
  if (
    sprint03Configuration.recommendationPolicy.confidenceGates.lowConfidenceWithholdEffort.includes(
      definition.effort,
    )
  ) {
    return { postGateResult: "withheld", reasonCode: "low_confidence_material_action" };
  }
  return { postGateResult: "presented", reasonCode: "low_confidence_low_effort" };
}

export function applyRecommendationConfidenceGate(input: {
  analysisConfidence: number;
  limitationCodes: string[];
  definitions: CatalogueDefinition[];
  candidates: Array<{
    recommendationId: string;
    recommendationVersion: string;
    catalogueOrder: number;
    result: "eligible" | "ineligible" | "excluded";
    sourceTraceNodeIds: string[];
  }>;
}): RecommendationConfidenceGateOutput {
  if (
    !Number.isFinite(input.analysisConfidence) ||
    input.analysisConfidence < 0 ||
    input.analysisConfidence > 100
  ) {
    throw new RecommendationConfidenceGateError("Recommendation confidence is outside 0..100");
  }
  const confidenceState = recommendationConfidenceState(input.analysisConfidence);
  const limitations = confidenceLimitations(input.limitationCodes);
  const caveat = caveatFor(confidenceState, limitations);
  const definitions = new Map(input.definitions.map((item) => [item.id, item]));
  const eligible = input.candidates
    .filter((candidate) => candidate.result === "eligible")
    .sort(
      (left, right) =>
        left.catalogueOrder - right.catalogueOrder ||
        left.recommendationId.localeCompare(right.recommendationId),
    );
  const candidates = eligible.map((candidate) => {
    const definition = definitions.get(candidate.recommendationId);
    if (
      !definition ||
      definition.version !== candidate.recommendationVersion ||
      definition.order !== candidate.catalogueOrder
    ) {
      throw new RecommendationConfidenceGateError(
        `Missing pinned catalogue definition for ${candidate.recommendationId}`,
      );
    }
    return {
      recommendationId: candidate.recommendationId,
      recommendationVersion: candidate.recommendationVersion,
      catalogueOrder: candidate.catalogueOrder,
      effort: definition.effort,
      preGateResult: "eligible" as const,
      ...gateResult(definition, confidenceState),
      confidenceState,
      caveat,
      limitationCodes: limitations.map((item) => item.code),
      sourceTraceNodeIds: [...candidate.sourceTraceNodeIds].sort(),
    };
  });
  if (
    confidenceState === "low" &&
    candidates.filter((candidate) => candidate.postGateResult === "evidence_first").length !== 1
  ) {
    throw new RecommendationConfidenceGateError(
      "Low confidence requires the approved evidence-first recommendation",
    );
  }
  return {
    schemaVersion: "deliveryiq.recommendation-confidence-gate/1.0.0",
    policyVersion: RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION,
    confidenceVersion: RECOMMENDATION_CONFIDENCE_VERSION,
    gateEngineVersion: RECOMMENDATION_CONFIDENCE_GATE_ENGINE_VERSION,
    confidence: {
      index: input.analysisConfidence,
      state: confidenceState,
      caveat,
      limitationCodes: limitations.map((item) => item.code),
    },
    candidates,
  };
}
