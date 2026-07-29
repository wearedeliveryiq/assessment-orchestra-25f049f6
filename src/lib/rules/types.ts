import type { RuleLogic, RuleStatus } from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";
import type { Signal } from "../signals/types";

export type { RuleLogic, RuleStatus, ObservationSeverity };

/**
 * The RuleResult entity — the immutable outcome of evaluating one knowledge
 * pack rule against the Signals inferred for an assessment.
 */
export interface RuleResult {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  ruleCode: string;
  name: string;
  description: string;
  category: string;
  status: RuleStatus;
  confidence: number;
  severity: ObservationSeverity;
  supportingSignalIds: string[];
  /** Knowledge pack signal codes behind the result (stable across reruns). */
  supportingSignalCodes: string[];
  evaluationReason: string;
  ruleExpression: string;
  weight: number;
  executedAt: string;
}

/** Full provenance: Rule -> Signals -> Observations -> Question -> Answer. */
export interface RuleTrace {
  rule: RuleResult;
  assessment: { id: string; organisationName: string; status: string };
  supportingSignals: {
    signal: Signal;
    observations: {
      observationId: string;
      definitionId: string;
      title: string;
      evidence: string;
      severity: ObservationSeverity;
      confidence: number;
      question: { id: string; sectionId: string; prompt: string } | null;
      answer: { value: number | string | null; label: string | null; answeredAt: string | null };
    }[];
  }[];
  knowledgePackRule: {
    packId: string;
    packVersion: string;
    ruleCode: string;
    logic: RuleLogic;
    threshold: number | null;
    minimumConfidence: number;
    declaredSignals: string[];
    expression: string;
    rationale: string;
  };
}

export interface RuleRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  signalsConsidered: number;
  evaluated: number;
  passed: number;
  failed: number;
  warning: number;
  notEvaluated: number;
  invalid: { ruleCode: string; message: string }[];
  errored: { ruleCode: string; error: string }[];
  durationMs: number;
}
