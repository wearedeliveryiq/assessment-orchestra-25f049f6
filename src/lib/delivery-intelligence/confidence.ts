import { sprint03Configuration } from "./config";
import { roundHalfUp } from "./math";

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
