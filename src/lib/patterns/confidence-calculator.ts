import {
  signalConfidenceCalculator,
  type ConfidenceEvidence,
} from "../signals/confidence-calculator";

/**
 * PatternConfidenceCalculator
 *
 * Single responsibility: turn a set of supporting Rule Results into a Pattern
 * confidence score. It deliberately does NOT average the rule confidences.
 *
 * The score layers a support factor on top of the shared, engine-agnostic
 * confidence model (corroboration + weighted strength + completeness +
 * definition weight):
 *
 *  1. base       — reused SignalConfidenceCalculator over the rule evidence;
 *  2. support    — proportion of the rules the pattern *requires* that fired,
 *                  so a pattern backed by 2 of 3 rules scores below one backed
 *                  by 3 of 3 even when the individual confidences match;
 *  3. breadth    — a mild bonus for corroboration across many distinct rules.
 *
 * The calculator is engine-agnostic: any later stage with evidence carrying
 * { confidence, weight } can reuse it.
 */

export interface PatternConfidenceInput {
  /** Confidence/weight of each supporting Rule Result. */
  evidence: ConfidenceEvidence[];
  /** Rule count the knowledge pack considers complete evidence. */
  expectedEvidence: number;
  /** Number of rules the pattern definition declares. */
  requiredCount: number;
  /** Weight declared on the pattern definition. */
  definitionWeight: number;
}

export interface PatternConfidenceBreakdown {
  confidence: number;
  base: number;
  support: number;
  breadth: number;
  corroboration: number;
  strength: number;
  completeness: number;
  weightFactor: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
/** Rounded to 4dp so repeated runs are byte-identical. */
const round = (value: number) => Math.round(value * 10_000) / 10_000;

export class PatternConfidenceCalculator {
  calculate(input: PatternConfidenceInput): PatternConfidenceBreakdown {
    const evidence = input.evidence.filter((item) => Number.isFinite(item.confidence));

    if (evidence.length === 0) {
      return {
        confidence: 0,
        base: 0,
        support: 0,
        breadth: 0,
        corroboration: 0,
        strength: 0,
        completeness: 0,
        weightFactor: 0,
      };
    }

    const base = signalConfidenceCalculator.calculate({
      evidence,
      expectedEvidence: input.expectedEvidence,
      definitionWeight: input.definitionWeight,
    });

    // 2. Support — how much of the declared rule set actually fired.
    const support = round(clamp(evidence.length / Math.max(input.requiredCount, 1)));

    // 3. Breadth — corroboration across independent rules, saturating quickly.
    const breadth = round(clamp(1 - 1 / (1 + evidence.length), 0, 1));

    const confidence = round(
      clamp(base.confidence * (0.65 + 0.25 * support + 0.1 * breadth), 0, 0.99),
    );

    return {
      confidence,
      base: base.confidence,
      support,
      breadth,
      corroboration: base.corroboration,
      strength: base.strength,
      completeness: base.completeness,
      weightFactor: base.weightFactor,
    };
  }
}

export const patternConfidenceCalculator = new PatternConfidenceCalculator();

/** Convenience helper for callers that only need the score. */
export function calculatePatternConfidence(input: PatternConfidenceInput): number {
  return patternConfidenceCalculator.calculate(input).confidence;
}
