import type { Observation } from "../observations/types";

/**
 * SignalConfidenceCalculator
 *
 * Single responsibility: turn a set of supporting observations into a
 * confidence score. Deliberately NOT a simple average — the score combines:
 *
 *  1. corroboration  — noisy-OR across supporting observation confidences, so
 *                      several independent weak signals still add up;
 *  2. strength       — weight-aware mean confidence of the evidence;
 *  3. completeness   — how much of the evidence the pack expected was found;
 *  4. definition weight — the pack's own conviction in the definition.
 *
 * The calculator is engine-agnostic so later stages (rules, patterns) can reuse
 * it with any evidence carrying { confidence, weight }.
 */

export interface ConfidenceEvidence {
  confidence: number;
  weight: number;
}

export interface ConfidenceInput {
  evidence: ConfidenceEvidence[];
  /** Evidence count the knowledge pack considers complete. */
  expectedEvidence: number;
  /** Weight declared on the knowledge pack definition. */
  definitionWeight: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Rounded to 4dp so repeated runs are byte-identical. */
const round = (value: number) => Math.round(value * 10_000) / 10_000;

export interface ConfidenceBreakdown {
  confidence: number;
  corroboration: number;
  strength: number;
  completeness: number;
  weightFactor: number;
}

export class SignalConfidenceCalculator {
  calculate(input: ConfidenceInput): ConfidenceBreakdown {
    const evidence = input.evidence.filter((item) => Number.isFinite(item.confidence));
    if (evidence.length === 0) {
      return { confidence: 0, corroboration: 0, strength: 0, completeness: 0, weightFactor: 0 };
    }

    // 1. Corroboration — probability that at least one piece of evidence holds.
    const corroboration = round(
      1 - evidence.reduce((product, item) => product * (1 - clamp(item.confidence)), 1),
    );

    // 2. Strength — weight-aware mean confidence.
    const weightSum = evidence.reduce((sum, item) => sum + Math.max(item.weight, 0.0001), 0);
    const strength = round(
      evidence.reduce(
        (sum, item) => sum + clamp(item.confidence) * Math.max(item.weight, 0.0001),
        0,
      ) / weightSum,
    );

    // 3. Completeness — proportion of the expected evidence actually present.
    const completeness = round(clamp(evidence.length / Math.max(input.expectedEvidence, 1)));

    // 4. Definition weight — a pack weight of 1.0 is neutral.
    const weightFactor = round(clamp(0.85 + clamp(input.definitionWeight, 0, 2) * 0.15, 0.5, 1.15));

    const blended = 0.55 * corroboration + 0.45 * strength;
    const confidence = round(clamp(blended * (0.7 + 0.3 * completeness) * weightFactor, 0, 0.99));

    return { confidence, corroboration, strength, completeness, weightFactor };
  }
}

export const signalConfidenceCalculator = new SignalConfidenceCalculator();

/** Convenience helper for callers that only need the score. */
export function calculateConfidence(input: ConfidenceInput): number {
  return signalConfidenceCalculator.calculate(input).confidence;
}

export function evidenceFromObservations(observations: Observation[]): ConfidenceEvidence[] {
  return observations.map((observation) => ({
    confidence: observation.confidence,
    weight: observation.weight,
  }));
}
