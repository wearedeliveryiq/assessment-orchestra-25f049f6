import type { ObservationSeverity } from "../knowledge-packs/schema";
import type { Observation } from "../observations/types";

export type { ObservationSeverity };

/**
 * The Signal entity — an organisational condition inferred from a collection of
 * Observations. Every field needed to replay the reasoning chain
 * (Signal -> Observations -> Question -> Answer) is retained.
 */
export interface Signal {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  signalCode: string;
  name: string;
  category: string;
  description: string;
  supportingObservationIds: string[];
  /** Knowledge pack observation definition ids behind the signal. */
  supportingDefinitionIds: string[];
  confidence: number;
  severity: ObservationSeverity;
  weight: number;
  ruleExpression: string;
  createdAt: string;
}

/** Full provenance for one signal. */
export interface SignalTrace {
  signal: Signal;
  assessment: { id: string; organisationName: string; status: string };
  supportingObservations: {
    observation: Observation;
    question: { id: string; sectionId: string; prompt: string } | null;
    answer: { value: number | string | null; label: string | null; answeredAt: string | null };
  }[];
  knowledgePackRule: {
    packId: string;
    packVersion: string;
    signalCode: string;
    expression: string;
    rationale: string;
    minConfidence: number;
    severity: ObservationSeverity;
    weight: number;
    expectedEvidence: number;
  };
}

export interface SignalRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  observationsConsidered: number;
  evaluated: number;
  generated: number;
  /** Definitions whose criteria or confidence floor were not met. */
  suppressed: { signalCode: string; reason: string }[];
  failed: { signalCode: string; error: string }[];
  durationMs: number;
}

export const SEVERITY_RANK: Record<ObservationSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};
