import type { ObservationSeverity } from "../knowledge-packs/schema";

export type { ObservationSeverity };

/**
 * The Observation entity. Every field required to replay the reasoning chain
 * (Assessment -> Question -> Answer -> Observation -> Knowledge Pack rule)
 * is retained, so no provenance is ever lost.
 */
export interface Observation {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  definitionId: string;
  questionId: string;
  category: string;
  title: string;
  description: string;
  evidence: string;
  severity: ObservationSeverity;
  confidence: number;
  weight: number;
  sourceValue: number | string | null;
  sourceLabel: string | null;
  ruleExpression: string;
  createdAt: string;
}

export interface ObservationTrace {
  observation: Observation;
  assessment: { id: string; organisationName: string; status: string };
  question: { id: string; sectionId: string; prompt: string } | null;
  answer: { value: number | string | null; label: string | null; answeredAt: string | null };
  knowledgePackRule: {
    packId: string;
    packVersion: string;
    definitionId: string;
    expression: string;
    severity: ObservationSeverity;
    confidence: number;
    weight: number;
  };
}

export interface ObservationRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  generated: number;
  skipped: number;
  failed: { definitionId: string; error: string }[];
  durationMs: number;
}

export const SEVERITY_ORDER: ObservationSeverity[] = ["critical", "high", "medium", "low", "info"];
