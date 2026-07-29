import type { ScoreDefinition } from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import { maturityCalculator, MaturityCalculator, type MaturityBand } from "./maturity-calculator";
import type { ScoreBreakdown, ScoreContribution } from "./types";

/**
 * ScoreCalculator
 *
 * Single responsibility: turn the Patterns supporting one scoring dimension
 * into a weighted score, a percentage, a maturity level and a confidence.
 *
 * Everything it applies — base score, direction, per-pattern impacts, severity
 * multipliers, expected evidence and maturity bands — comes from the active
 * Knowledge Pack. The calculator contains no domain rules of its own.
 *
 * Confidence is deliberately NOT an average. It combines:
 *  1. strength     — weight-aware mean confidence of the supporting patterns;
 *  2. coverage     — proportion of the declared patterns actually evaluated;
 *  3. completeness — evidence found against the evidence the pack expected;
 *  4. weightFactor — the pack's own conviction in the dimension;
 *  5. assessment completeness — how much of the questionnaire was answered.
 */

export interface ScoreCalculationInput {
  definition: ScoreDefinition;
  /** Patterns identified for the session (the calculator filters them). */
  patterns: Pattern[];
  /** Pack-wide severity multipliers used when the dimension declares none. */
  defaultSeverityMultipliers: Record<string, number>;
  /** Pack-wide maturity bands used when the dimension declares none. */
  defaultMaturityBands: MaturityBand[];
  /** 0–1 completion of the underlying questionnaire. */
  assessmentCompleteness: number;
}

export interface ScoreCalculation {
  definition: ScoreDefinition;
  overallScore: number;
  maximumScore: number;
  percentage: number;
  maturityLevel: string;
  severity: ObservationSeverity;
  confidence: number;
  supporting: Pattern[];
  breakdown: ScoreBreakdown;
  expression: string;
  reason: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Rounded to 4dp (2dp for scores) so repeated runs are byte-identical. */
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;
const round2 = (value: number) => Math.round(value * 100) / 100;

export class ScoreCalculator {
  constructor(private readonly maturity: MaturityCalculator = maturityCalculator) {}

  calculate(input: ScoreCalculationInput): ScoreCalculation {
    const { definition } = input;
    const declared = definition.patterns;
    const multipliers = definition.severityMultipliers ?? input.defaultSeverityMultipliers;

    // Only patterns the dimension declares participate; ordering is stable so
    // the calculation is deterministic across runs.
    const supporting = input.patterns
      .filter((pattern) => declared.includes(pattern.patternCode))
      .sort((a, b) => a.patternCode.localeCompare(b.patternCode));

    const maximumScore = definition.maximumScore;
    const baseScore =
      definition.baseScore ?? (definition.direction === "deduct" ? maximumScore : 0);

    const contributions: ScoreContribution[] = supporting.map((pattern) => {
      const configuredImpact =
        definition.patternImpacts[pattern.patternCode] ?? definition.defaultImpact;
      const severityMultiplier = multipliers[pattern.severity] ?? 1;
      // Confidence scales the impact: a weakly-evidenced pattern moves the
      // score less than a strongly-evidenced one.
      const appliedImpact = round4(
        configuredImpact * severityMultiplier * pattern.confidence * (pattern.weight || 1),
      );
      return {
        patternId: pattern.id,
        patternCode: pattern.patternCode,
        patternName: pattern.name,
        severity: pattern.severity,
        confidence: pattern.confidence,
        configuredImpact,
        severityMultiplier,
        appliedImpact,
      };
    });

    const totalImpact = round4(
      contributions.reduce((sum, contribution) => sum + contribution.appliedImpact, 0),
    );

    const raw =
      definition.direction === "deduct" ? baseScore - totalImpact : baseScore + totalImpact;
    const overallScore = round2(clamp(raw, 0, maximumScore));
    const percentage = round2(clamp((overallScore / maximumScore) * 100, 0, 100));

    const bands = this.maturity.resolveBands(definition.maturityBands, input.defaultMaturityBands);
    const maturity = this.maturity.calculate(percentage, bands);

    const confidence = this.confidence(input, supporting);

    const expression = `${definition.direction === "deduct" ? "base" : "0"}(${baseScore}) ${
      definition.direction === "deduct" ? "-" : "+"
    } Σ impact(${declared.join(", ")}) → clamp(0, ${maximumScore})`;

    const reason =
      supporting.length === 0
        ? `No patterns matched for ${definition.dimension}; the dimension retains its base score of ${baseScore}.`
        : `${supporting.length} of ${declared.length} declared pattern(s) matched (${supporting
            .map((pattern) => pattern.patternCode)
            .join(", ")}), applying ${totalImpact} point(s) ${
            definition.direction === "deduct" ? "against" : "towards"
          } a base of ${baseScore}.`;

    return {
      definition,
      overallScore,
      maximumScore,
      percentage,
      maturityLevel: maturity.level,
      severity: maturity.severity,
      confidence: confidence.confidence,
      supporting,
      breakdown: {
        baseScore,
        direction: definition.direction,
        totalImpact,
        contributions,
        confidence,
      },
      expression,
      reason,
    };
  }

  /** Multi-factor confidence — see the class docblock. */
  private confidence(
    input: ScoreCalculationInput,
    supporting: Pattern[],
  ): ScoreBreakdown["confidence"] {
    const declaredCount = Math.max(input.definition.patterns.length, 1);
    const completenessOfAssessment = clamp(input.assessmentCompleteness, 0, 1);

    // Coverage: how much of the declared pattern set was resolvable.
    const coverage = round4(clamp(supporting.length / declaredCount, 0, 1));

    // Completeness: evidence found vs. the evidence the pack expected.
    const completeness = round4(
      clamp(supporting.length / Math.max(input.definition.expectedEvidence, 1), 0, 1),
    );

    // Strength: weight-aware mean confidence of the supporting patterns. With
    // no matching patterns the dimension is scored on absence of risk, which is
    // a strong statement only when the assessment itself is complete.
    const totalWeight = supporting.reduce((sum, pattern) => sum + (pattern.weight || 1), 0);
    const strength =
      supporting.length === 0
        ? round4(0.6 * completenessOfAssessment + 0.4)
        : round4(
            clamp(
              supporting.reduce(
                (sum, pattern) => sum + pattern.confidence * (pattern.weight || 1),
                0,
              ) / (totalWeight || 1),
              0,
              1,
            ),
          );

    const weightFactor = round4(clamp(0.85 + Math.log10(1 + (input.definition.weight || 1)) / 8, 0, 1));

    const evidenceFactor =
      supporting.length === 0 ? 0.75 : 0.55 + 0.25 * coverage + 0.2 * completeness;

    const confidence = round4(
      clamp(
        strength * evidenceFactor * weightFactor * (0.7 + 0.3 * completenessOfAssessment),
        0,
        0.99,
      ),
    );

    return { confidence, coverage, completeness, strength, weightFactor };
  }
}

export const scoreCalculator = new ScoreCalculator();
