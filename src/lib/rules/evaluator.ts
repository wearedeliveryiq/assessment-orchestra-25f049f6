import type { RuleDefinition, RuleLogic, RuleStatus } from "../knowledge-packs/schema";
import { signalConfidenceCalculator } from "../signals/confidence-calculator";
import type { Signal } from "../signals/types";

/**
 * RuleEvaluator
 *
 * Single responsibility: decide the outcome of ONE rule definition against the
 * Signals of an assessment. It holds no rule knowledge of its own — operators
 * are looked up in an extensible registry, and every threshold, severity and
 * explanation comes from the knowledge pack definition.
 */

export interface RuleOperatorInput {
  matchedCount: number;
  declaredCount: number;
  threshold: number | null;
}

export type RuleOperator = (input: RuleOperatorInput) => boolean;

/** Additional operators can be registered without touching the engine. */
export const RULE_OPERATORS: Record<RuleLogic, RuleOperator> = {
  ALL: ({ matchedCount, declaredCount }) => declaredCount > 0 && matchedCount === declaredCount,
  ANY: ({ matchedCount }) => matchedCount > 0,
  NONE: ({ matchedCount }) => matchedCount === 0,
  AT_LEAST: ({ matchedCount, threshold }) => threshold !== null && matchedCount >= threshold,
  EXACTLY: ({ matchedCount, threshold }) => threshold !== null && matchedCount === threshold,
};

export interface RuleEvaluation {
  definition: RuleDefinition;
  matched: Signal[];
  status: RuleStatus;
  satisfied: boolean;
  confidence: number;
  reason: string;
  expression: string;
}

const round = (value: number) => Math.round(value * 10_000) / 10_000;

export function describeRule(definition: RuleDefinition): string {
  const threshold =
    definition.threshold !== undefined && definition.threshold !== null
      ? ` ${definition.threshold}`
      : "";
  return `${definition.ruleCode}: ${definition.logic}${threshold} of [${definition.signals.join(", ")}] with signal confidence ≥ ${definition.minimumConfidence}`;
}

export class RuleEvaluator {
  constructor(private readonly operators: Record<string, RuleOperator> = RULE_OPERATORS) {}

  /** Signals declared by the rule that clear the rule's confidence floor. */
  select(definition: RuleDefinition, signals: Signal[]): Signal[] {
    const declared = new Set(definition.signals);
    return signals
      .filter(
        (signal) =>
          declared.has(signal.signalCode) && signal.confidence >= definition.minimumConfidence,
      )
      .slice()
      .sort((a, b) => a.signalCode.localeCompare(b.signalCode));
  }

  evaluate(definition: RuleDefinition, signals: Signal[]): RuleEvaluation {
    const operator = this.operators[definition.logic];
    if (!operator) {
      throw new Error(`Unsupported rule operator "${definition.logic}"`);
    }

    const matched = this.select(definition, signals);
    const threshold = definition.threshold ?? null;
    const satisfied = operator({
      matchedCount: matched.length,
      declaredCount: definition.signals.length,
      threshold,
    });

    const confidence = this.confidenceFor(definition, matched, satisfied);
    const status: RuleStatus = satisfied ? "passed" : definition.statusOnFail;

    return {
      definition,
      matched,
      status,
      satisfied,
      confidence,
      reason: this.explain(definition, matched, satisfied, confidence),
      expression: describeRule(definition),
    };
  }

  /**
   * Presence rules score on the strength of their evidence; NONE rules score on
   * the certainty of absence, so a stray weak signal lowers confidence.
   */
  private confidenceFor(
    definition: RuleDefinition,
    matched: Signal[],
    satisfied: boolean,
  ): number {
    if (definition.logic === "NONE") {
      const strongest = matched.reduce((max, signal) => Math.max(max, signal.confidence), 0);
      return round(satisfied ? 1 : Math.max(0, 1 - strongest));
    }

    if (matched.length === 0) return 0;

    return round(
      signalConfidenceCalculator.calculate({
        evidence: matched.map((signal) => ({
          confidence: signal.confidence,
          weight: signal.weight,
        })),
        expectedEvidence: definition.threshold ?? definition.signals.length,
        definitionWeight: definition.weight,
      }).confidence,
    );
  }

  /** Human-readable explanation, later consumed by the Narrative Engine. */
  private explain(
    definition: RuleDefinition,
    matched: Signal[],
    satisfied: boolean,
    confidence: number,
  ): string {
    if (!satisfied) {
      const names = matched.length > 0 ? matched.map((s) => s.name).join(", ") : "none";
      return `Condition not met: ${definition.logic}${
        definition.threshold !== undefined ? ` ${definition.threshold}` : ""
      } of [${definition.signals.join(", ")}] required, ${matched.length} qualifying signal(s) found (${names}).`;
    }

    const signalNames =
      matched.length > 0 ? matched.map((signal) => signal.name).join(", ") : "no risk signals";

    return definition.explanationTemplate
      .replaceAll("{name}", definition.name)
      .replaceAll("{count}", String(matched.length))
      .replaceAll("{signals}", signalNames)
      .replaceAll("{confidence}", `${Math.round(confidence * 100)}%`);
  }
}

export const ruleEvaluator = new RuleEvaluator();
