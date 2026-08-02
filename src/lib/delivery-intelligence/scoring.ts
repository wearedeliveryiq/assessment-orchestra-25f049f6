import { sprint03Configuration } from "./config";
import { mean, roundHalfUp } from "./math";

export type EvidenceStatus = "answered" | "not_applicable" | "excluded" | "missing";
export interface ScoreResponse {
  value?: number;
  status: EvidenceStatus;
  reason?: string;
}

export interface CapabilityScoreResult {
  available: boolean;
  rawScore: number | null;
  displayScore: number | null;
  band: string | null;
  eligibleWeight: number;
  eligibleQuestionCount: number;
  missingQuestionIds: string[];
  excludedQuestionIds: string[];
  notApplicableQuestionIds: string[];
  reasonCode?: "insufficient_evidence";
  contextContribution: 0;
  contributions: Array<{
    questionId: string;
    weight: number;
    normalised: number;
    contribution: number;
  }>;
}

export function scoreBand(rawScore: number): string {
  const band = sprint03Configuration.scoring.bands.find(
    (candidate) =>
      rawScore >= candidate.minimumInclusive &&
      ("maximumExclusive" in candidate
        ? rawScore < Number(candidate.maximumExclusive)
        : rawScore <= Number(candidate.maximumInclusive)),
  );
  if (!band) throw new Error("ANALYSIS_INPUT_INVALID: score is outside the approved scale");
  return band.id;
}

export function calculateCapabilityScore(
  questionWeights: Record<string, number>,
  responses: Record<string, ScoreResponse>,
): CapabilityScoreResult {
  const entries = Object.entries(questionWeights).sort(([a], [b]) => a.localeCompare(b));
  const missingQuestionIds: string[] = [];
  const excludedQuestionIds: string[] = [];
  const notApplicableQuestionIds: string[] = [];
  const eligible: Array<{ questionId: string; weight: number; normalised: number }> = [];

  for (const [questionId, weight] of entries) {
    const response = responses[questionId] ?? { status: "missing" as const };
    if (response.status === "missing") missingQuestionIds.push(questionId);
    else if (response.status === "excluded") {
      if (
        !response.reason ||
        !sprint03Configuration.scoring.approvedExclusionReasons.includes(response.reason)
      ) {
        throw new Error("ANALYSIS_INPUT_INVALID: excluded evidence requires an approved reason");
      }
      excludedQuestionIds.push(questionId);
    } else if (response.status === "not_applicable") {
      if (!response.reason)
        throw new Error("ANALYSIS_INPUT_INVALID: not-applicable evidence requires a reason");
      notApplicableQuestionIds.push(questionId);
    } else {
      if (!Number.isInteger(response.value) || response.value! < 1 || response.value! > 5) {
        throw new Error("ANALYSIS_INPUT_INVALID: answered evidence must be an integer from 1 to 5");
      }
      eligible.push({ questionId, weight, normalised: ((response.value! - 1) / 4) * 100 });
    }
  }

  const eligibleWeight = roundHalfUp(
    eligible.reduce((sum, item) => sum + item.weight, 0),
    6,
  );
  const available =
    eligible.length >= sprint03Configuration.scoring.minimumEligibleQuestionsPerCapability &&
    eligibleWeight >= sprint03Configuration.scoring.minimumEligibleWeightPerCapability;
  const base = {
    available,
    eligibleWeight,
    eligibleQuestionCount: eligible.length,
    missingQuestionIds,
    excludedQuestionIds,
    notApplicableQuestionIds,
    contextContribution: 0 as const,
  };
  if (!available) {
    return {
      ...base,
      rawScore: null,
      displayScore: null,
      band: null,
      reasonCode: "insufficient_evidence",
      contributions: [],
    };
  }

  const contributions = eligible.map((item) => ({
    ...item,
    contribution: (item.normalised * item.weight) / eligibleWeight,
  }));
  const rawScore = roundHalfUp(
    contributions.reduce((sum, item) => sum + item.contribution, 0),
    6,
  );
  return {
    ...base,
    rawScore,
    displayScore: roundHalfUp(rawScore, sprint03Configuration.scoring.displayPrecisionDecimals),
    band: scoreBand(rawScore),
    contributions: contributions.map((item) => ({
      ...item,
      contribution: roundHalfUp(item.contribution, 6),
    })),
  };
}

export function calculateOverallScore(capabilityScores: number[]) {
  const availableCapabilityCount = capabilityScores.length;
  if (
    availableCapabilityCount < sprint03Configuration.scoring.minimumAvailableCapabilitiesForOverall
  ) {
    return {
      available: false,
      rawScore: null,
      displayScore: null,
      band: null,
      availableCapabilityCount,
      reasonCode: "insufficient_capability_coverage",
    };
  }
  const rawScore = roundHalfUp(mean(capabilityScores), 6);
  return {
    available: true,
    rawScore,
    displayScore: roundHalfUp(rawScore, 1),
    band: scoreBand(rawScore),
    availableCapabilityCount,
  };
}
