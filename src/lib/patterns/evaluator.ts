import type { PatternDefinition, PatternLogic } from "../knowledge-packs/schema";
import type { RuleResult } from "../rules/types";
import { patternConfidenceCalculator } from "./confidence-calculator";
import type { ObservationSeverity } from "./types";

/**
 * PatternEvaluator
 *
 * Single responsibility: decide the outcome of ONE pattern definition against
 * the Rule Results of an assessment. It holds no pattern knowledge of its own —
 * operators live in an extensible registry and every threshold, severity and
 * explanation comes from the knowledge pack.
 */

export interface PatternOperatorInput {
  matchedCount: number;
  declaredCount: number;
  threshold: number | null;
}

export type PatternOperator = (input: PatternOperatorInput) => boolean;

/** Additional operators can be registered without touching the engine. */
export const PATTERN_OPERATORS: Record<PatternLogic, PatternOperator> = {
  ALL: ({ matchedCount, declaredCount }) => declaredCount > 0 && matchedCount === declaredCount,
  ANY: ({ matchedCount }) => matchedCount > 0,
  NONE: ({ matchedCount }) => matchedCount === 0,
  AT_LEAST: ({ matchedCount, threshold }) => threshold !== null && matchedCount >= threshold,
  EXACTLY: ({ matchedCount, threshold }) => threshold !== null && matchedCount === threshold,
};

export interface PatternEvaluation {
  definition: PatternDefinition;
  matched: RuleResult[];
  satisfied: boolean;
  confidence: number;
  severity: ObservationSeverity;
  reason: string;
  expression: string;
}

const SEVERITY_RANK: Record<ObservationSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const round = (value: number) => Math.round(value * 10_000) / 10_000;

export function describePattern(definition: PatternDefinition): string {
  const threshold =
    definition.threshold !== undefined && definition.threshold !== null
      ? ` ${definition.threshold}`
      : "";
  return `${definition.patternCode}: ${definition.logic}${threshold} of [${definition.requiredRules.join(", ")}] with rule confidence ≥ ${definition.minimumConfidence}`;
}

export class PatternEvaluator {
  constructor(private readonly operators: Record<string, PatternOperator> = PATTERN_OPERATORS) {}

  /** Rule Results declared by the pattern that clear its status + confidence floor. */
  select(definition: PatternDefinition, rules: RuleResult[]): RuleResult[] {
    const declared = new Set(definition.requiredRules);
    const statuses = new Set(definition.statusIn);
    return rules
      .filter(
        (rule) =>
          declared.has(rule.ruleCode) &&
          statuses.has(rule.status) &&
          rule.confidence >= definition.minimumConfidence,
      )
      .slice()
      .sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));
  }

  evaluate(definition: PatternDefinition, rules: RuleResult[]): PatternEvaluation {
    const operator = this.operators[definition.logic];
    if (!operator) {
      throw new Error(`Unsupported pattern operator "${definition.logic}"`);
    }

    const matched = this.select(definition, rules);
    const threshold = definition.threshold ?? null;
    const satisfied = operator({
      matchedCount: matched.length,
      declaredCount: definition.requiredRules.length,
      threshold,
    });

    const confidence = this.confidenceFor(definition, matched, satisfied);

    return {
      definition,
      matched,
      satisfied,
      confidence,
      severity: this.severityFor(definition, matched),
      reason: this.explain(definition, matched, satisfied, confidence),
      expression: describePattern(definition),
    };
  }

  /**
   * Presence patterns score on the strength of their supporting rules; NONE
   * patterns score on the certainty of absence, so a stray strong rule lowers
   * confidence in the pattern.
   */
  private confidenceFor(
    definition: PatternDefinition,
    matched: RuleResult[],
    satisfied: boolean,
  ): number {
    if (definition.logic === "NONE") {
      const strongest = matched.reduce((max, rule) => Math.max(max, rule.confidence), 0);
      return round(satisfied ? 1 : Math.max(0, 1 - strongest));
    }

    if (matched.length === 0) return 0;

    return round(
      patternConfidenceCalculator.calculate({
        evidence: matched.map((rule) => ({ confidence: rule.confidence, weight: rule.weight })),
        expectedEvidence: definition.expectedEvidence,
        requiredCount: definition.threshold ?? definition.requiredRules.length,
        definitionWeight: definition.weight,
      }).confidence,
    );
  }

  /**
   * Severity is the pack's declared severity, escalated to the strongest
   * supporting rule severity when the evidence is graver than expected. Only
   * risk patterns escalate — informational patterns stay informational.
   */
  private severityFor(
    definition: PatternDefinition,
    matched: RuleResult[],
  ): ObservationSeverity {
    if (definition.severity === "info" || matched.length === 0) return definition.severity;

    return matched.reduce<ObservationSeverity>(
      (worst, rule) =>
        SEVERITY_RANK[rule.severity] > SEVERITY_RANK[worst] ? rule.severity : worst,
      definition.severity,
    );
  }

  /** Human-readable explanation, later consumed by the Narrative Engine. */
  private explain(
    definition: PatternDefinition,
    matched: RuleResult[],
    satisfied: boolean,
    confidence: number,
  ): string {
    if (!satisfied) {
      const names = matched.length > 0 ? matched.map((r) => r.name).join(", ") : "none";
      return `Condition not met: ${definition.logic}${
        definition.threshold !== undefined ? ` ${definition.threshold}` : ""
      } of [${definition.requiredRules.join(", ")}] required, ${matched.length} qualifying rule result(s) found (${names}).`;
    }

    const ruleNames = matched.length > 0 ? matched.map((rule) => rule.name).join(", ") : "no rules";

    return definition.explanationTemplate
      .replaceAll("{name}", definition.name)
      .replaceAll("{count}", String(matched.length))
      .replaceAll("{rules}", ruleNames)
      .replaceAll("{confidence}", `${Math.round(confidence * 100)}%`);
  }
}

export const patternEvaluator = new PatternEvaluator();
