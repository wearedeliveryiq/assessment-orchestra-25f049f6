import { sprint03Configuration } from "./config";
import { mean, populationStandardDeviation, roundHalfUp } from "./math";
import type { CanonicalAnalysisResponse } from "../analysis/types";

export type ConfidenceFactorId = keyof typeof sprint03Configuration.confidence.limitations;
export type ConfidenceFactors = Record<ConfidenceFactorId, number>;

const LIMITATION_CODES: Record<ConfidenceFactorId, string> = {
  required_completion: "incomplete_required_evidence",
  capability_coverage: "limited_capability_coverage",
  response_consistency: "inconsistent_responses",
  evidence_recency: "stale_evidence",
  respondent_breadth: "limited_respondent_breadth",
};

export function confidenceBand(index: number): string {
  const band = sprint03Configuration.confidence.bands.find(
    (candidate) =>
      index >= candidate.minimumInclusive &&
      ("maximumExclusive" in candidate
        ? index < Number(candidate.maximumExclusive)
        : index <= Number(candidate.maximumInclusive)),
  );
  if (!band) throw new Error("ANALYSIS_INPUT_INVALID: confidence is outside the approved scale");
  return band.id;
}

export function calculateConfidence(factors: ConfidenceFactors) {
  const configured = sprint03Configuration.confidence.factors;
  let weighted = 0;
  for (const factor of configured) {
    const value = factors[factor.id as ConfidenceFactorId];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`ANALYSIS_INPUT_INVALID: invalid confidence factor ${factor.id}`);
    }
    weighted += value * factor.weight;
  }
  const index = roundHalfUp(
    100 * weighted,
    sprint03Configuration.confidence.storagePrecisionDecimals,
  );
  const limitations = configured
    .filter(
      (factor) =>
        factors[factor.id as ConfidenceFactorId] <
        sprint03Configuration.confidence.limitationThresholdExclusive,
    )
    .map((factor) => LIMITATION_CODES[factor.id as ConfidenceFactorId]);
  return {
    index,
    displayIndex: roundHalfUp(index, sprint03Configuration.confidence.displayPrecisionDecimals),
    band: confidenceBand(index),
    limitations,
  };
}

function recencyValue(evidenceAt: string | null, completedAt: string): number {
  if (!evidenceAt) return 0;
  const days = Math.max(0, (Date.parse(completedAt) - Date.parse(evidenceAt)) / 86_400_000);
  const buckets = sprint03Configuration.confidence.factors.find(
    (factor) => factor.id === "evidence_recency",
  )?.buckets as Array<{ maximumDays: number | null; value: number }> | undefined;
  if (!buckets) throw new Error("ANALYSIS_CONFIGURATION_INVALID: recency buckets missing");
  return buckets.find((bucket) => bucket.maximumDays == null || days <= bucket.maximumDays)!.value;
}

function breadthValue(groups: number): number {
  if (groups >= 3) return 1;
  if (groups === 2) return 0.7;
  if (groups === 1) return 0.4;
  return 0;
}

export interface ConfidenceDerivationCapability {
  id: string;
  requiredQuestionIds: string[];
  responses: CanonicalAnalysisResponse[];
  available: boolean;
}

export function deriveConfidenceFactors(input: {
  completedAt: string;
  capabilities: ConfidenceDerivationCapability[];
}) {
  const allResponses = input.capabilities.flatMap((capability) => capability.responses);
  const requiredIds = input.capabilities.flatMap((capability) => capability.requiredQuestionIds);
  const eligibleRequired = allResponses.filter(
    (response) => requiredIds.includes(response.questionId) && response.status === "answered",
  ).length;
  const consistency = input.capabilities
    .filter((capability) => capability.available)
    .map((capability) => {
      const values = capability.responses
        .filter((response) => response.status === "answered" && typeof response.value === "number")
        .map((response) => ((Number(response.value) - 1) / 4) * 100);
      return 1 - Math.min(populationStandardDeviation(values) / 50, 1);
    });
  const eligible = allResponses.filter((response) => response.status === "answered");
  const groups = new Set(eligible.map((response) => response.respondentGroupId).filter(Boolean));
  const factors: ConfidenceFactors = {
    required_completion: requiredIds.length ? eligibleRequired / requiredIds.length : 0,
    capability_coverage:
      input.capabilities.filter((capability) => capability.available).length /
      sprint03Configuration.capabilities.length,
    response_consistency: mean(consistency),
    evidence_recency: mean(
      eligible.map((response) => recencyValue(response.evidenceAt, input.completedAt)),
    ),
    respondent_breadth: breadthValue(groups.size),
  };
  return { factors, result: calculateConfidence(factors) };
}

export function calculateCapabilityConfidence(
  capability: ConfidenceDerivationCapability,
  completedAt: string,
): number {
  const requiredCompletion = capability.requiredQuestionIds.length
    ? capability.responses.filter(
        (response) =>
          capability.requiredQuestionIds.includes(response.questionId) &&
          response.status === "answered",
      ).length / capability.requiredQuestionIds.length
    : 0;
  const eligible = capability.responses.filter(
    (response) => response.status === "answered" && typeof response.value === "number",
  );
  const consistency = capability.available
    ? 1 -
      Math.min(
        populationStandardDeviation(
          eligible.map((response) => ((Number(response.value) - 1) / 4) * 100),
        ) / 50,
        1,
      )
    : 0;
  const recency = mean(eligible.map((response) => recencyValue(response.evidenceAt, completedAt)));
  // DIQ-203 §6: rescale the three relevant weighted factors to 100.
  return roundHalfUp(
    (100 * (requiredCompletion * 0.35 + consistency * 0.2 + recency * 0.1)) / 0.65,
    6,
  );
}
