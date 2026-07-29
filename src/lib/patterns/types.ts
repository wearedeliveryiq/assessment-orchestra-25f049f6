import type { PatternLogic, RuleStatus } from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";
import type { RuleResult } from "../rules/types";
import type { Signal } from "../signals/types";

export type { PatternLogic, ObservationSeverity };

/**
 * The Pattern entity — an immutable, higher-order organisational behaviour
 * inferred from Rule Results for one assessment session.
 */
export interface Pattern {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  patternCode: string;
  name: string;
  category: string;
  description: string;
  businessImpact: string;
  confidence: number;
  severity: ObservationSeverity;
  weight: number;
  /** Persisted RuleResult ids behind the pattern. */
  supportingRuleIds: string[];
  /** Knowledge pack rule codes behind the pattern (stable across reruns). */
  supportingRuleCodes: string[];
  patternExpression: string;
  evaluationReason: string;
  createdAt: string;
}

/**
 * Full provenance:
 * Pattern -> Rules -> Signals -> Observations -> Questions -> Responses.
 */
export interface PatternTrace {
  pattern: Pattern;
  assessment: { id: string; organisationName: string; status: string };
  supportingRules: {
    rule: RuleResult;
    signals: {
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
  }[];
  knowledgePackPattern: {
    packId: string;
    packVersion: string;
    patternCode: string;
    logic: PatternLogic;
    threshold: number | null;
    minimumConfidence: number;
    statusIn: RuleStatus[];
    declaredRules: string[];
    expression: string;
    businessImpact: string;
  };
}

export interface PatternRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  rulesConsidered: number;
  evaluated: number;
  matched: number;
  discarded: number;
  invalid: { patternCode: string; message: string }[];
  errored: { patternCode: string; error: string }[];
  durationMs: number;
}
