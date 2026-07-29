import type { SignalDefinition } from "../knowledge-packs/schema";
import type { Observation } from "../observations/types";
import {
  signalConfidenceCalculator,
  evidenceFromObservations,
  type ConfidenceBreakdown,
} from "./confidence-calculator";
import { SEVERITY_RANK, type ObservationSeverity } from "./types";

/**
 * SignalEvaluator
 *
 * Single responsibility: decide whether one signal definition is met by a
 * collection of observations, and with what confidence and severity.
 * Contains no signal-specific knowledge — every threshold, selector and
 * wording comes from the Knowledge Pack definition passed in.
 */

export interface SignalEvaluation {
  definition: SignalDefinition;
  matched: Observation[];
  met: boolean;
  reason?: string;
  confidence: number;
  breakdown: ConfidenceBreakdown;
  severity: ObservationSeverity;
  expression: string;
}

export function describeSignalRule(definition: SignalDefinition): string {
  const parts: string[] = [];
  if (definition.match.observationIds.length > 0) {
    parts.push(`observations in [${definition.match.observationIds.join(", ")}]`);
  }
  if (definition.match.definitionIdMatches) {
    parts.push(`definition id matches /${definition.match.definitionIdMatches}/`);
  }
  if (definition.match.severityIn) {
    parts.push(`severity in [${definition.match.severityIn.join(", ")}]`);
  }
  if (definition.match.categoryIn) {
    parts.push(`category in [${definition.match.categoryIn.join(", ")}]`);
  }
  return `${definition.code}: ${parts.join(" and ")} — at least ${definition.match.minMatches} match(es), confidence ≥ ${definition.minConfidence}`;
}

export class SignalEvaluator {
  /** Observations that satisfy the definition's selectors, in stable order. */
  select(definition: SignalDefinition, observations: Observation[]): Observation[] {
    const { observationIds, definitionIdMatches, severityIn, categoryIn } = definition.match;
    const explicit = new Set(observationIds);
    const pattern = definitionIdMatches ? new RegExp(definitionIdMatches) : null;

    return observations
      .filter((observation) => {
        const idMatch =
          (explicit.size > 0 && explicit.has(observation.definitionId)) ||
          (pattern !== null && pattern.test(observation.definitionId)) ||
          (explicit.size === 0 && pattern === null);
        if (!idMatch) return false;
        if (severityIn && !severityIn.includes(observation.severity)) return false;
        if (categoryIn && !categoryIn.includes(observation.category)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
  }

  evaluate(definition: SignalDefinition, observations: Observation[]): SignalEvaluation {
    const matched = this.select(definition, observations);
    const expression = describeSignalRule(definition);
    const breakdown = signalConfidenceCalculator.calculate({
      evidence: evidenceFromObservations(matched),
      expectedEvidence: definition.expectedEvidence,
      definitionWeight: definition.weight,
    });

    const severity = this.resolveSeverity(definition, matched);

    if (matched.length < definition.match.minMatches) {
      return {
        definition,
        matched,
        met: false,
        reason: `only ${matched.length} of ${definition.match.minMatches} required supporting observations`,
        confidence: breakdown.confidence,
        breakdown,
        severity,
        expression,
      };
    }

    if (breakdown.confidence < definition.minConfidence) {
      return {
        definition,
        matched,
        met: false,
        reason: `confidence ${breakdown.confidence.toFixed(2)} below minimum ${definition.minConfidence}`,
        confidence: breakdown.confidence,
        breakdown,
        severity,
        expression,
      };
    }

    return {
      definition,
      matched,
      met: true,
      confidence: breakdown.confidence,
      breakdown,
      severity,
      expression,
    };
  }

  /**
   * Severity comes from the definition. When the pack opts in with
   * escalateWithEvidence, the strongest supporting observation can raise it.
   */
  private resolveSeverity(
    definition: SignalDefinition,
    matched: Observation[],
  ): ObservationSeverity {
    if (!definition.escalateWithEvidence || matched.length === 0) return definition.severity;
    return matched.reduce<ObservationSeverity>(
      (worst, observation) =>
        SEVERITY_RANK[observation.severity] > SEVERITY_RANK[worst] ? observation.severity : worst,
      definition.severity,
    );
  }
}

export const signalEvaluator = new SignalEvaluator();
