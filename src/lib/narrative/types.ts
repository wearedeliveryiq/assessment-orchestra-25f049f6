import type {
  NarrativeConfig,
  NarrativeEvidenceKind,
  NarrativeSectionDefinition,
} from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { RuleResult } from "../rules/types";
import type { Score, ScoreSummaryEntity } from "../scores/types";
import type { Signal } from "../signals/types";

export type {
  NarrativeConfig,
  NarrativeEvidenceKind,
  NarrativeSectionDefinition,
  ObservationSeverity,
};

export type NarrativeMode = "template" | "ai" | "hybrid";

/** How an individual section was actually produced (may differ from the pack mode). */
export type NarrativeSectionSource = "template" | "ai";

/** A single traceable citation behind a sentence or section. */
export interface NarrativeEvidenceRef {
  kind: "score" | "pattern" | "summary";
  /** Stable knowledge-pack code (score code / pattern code). */
  code: string;
  /** Persisted entity id where one exists. */
  entityId: string | null;
  label: string;
  detail: string;
  confidence: number;
}

export interface NarrativeSection {
  key: string;
  title: string;
  order: number;
  body: string;
  wordCount: number;
  source: NarrativeSectionSource;
  guidance: string;
  evidence: NarrativeEvidenceRef[];
  /** Populated when AI generation was attempted and rejected/failed. */
  fallbackReason: string | null;
}

export interface NarrativeValidationIssue {
  sectionKey: string | null;
  code: string;
  message: string;
}

export interface NarrativeValidationResult {
  valid: boolean;
  issues: NarrativeValidationIssue[];
  warnings: NarrativeValidationIssue[];
}

export interface NarrativeEvidenceSummary {
  responseCount: number;
  observationCount: number;
  signalCount: number;
  ruleCount: number;
  patternCount: number;
  dimensionCount: number;
  overallPercentage: number;
  maturityLevel: string;
}

/**
 * The Narrative entity — an immutable, evidence-bound executive narrative
 * generated for one assessment session.
 */
export interface Narrative {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  headline: string;
  summary: string;
  mode: NarrativeMode;
  provider: string;
  model: string;
  tone: string;
  audience: string;
  confidence: number;
  sections: NarrativeSection[];
  evidence: NarrativeEvidenceSummary;
  validation: NarrativeValidationResult;
  generationMs: number;
  createdAt: string;
}

/** Evidence the composer reasons over. Nothing else may enter a narrative. */
export interface NarrativeEvidence {
  organisationName: string;
  packId: string;
  packName: string;
  packVersion: string;
  summary: ScoreSummaryEntity | null;
  scores: Score[];
  patterns: Pattern[];
  rules: RuleResult[];
  signals: Signal[];
  counts: {
    responses: number;
    observations: number;
    signals: number;
    rules: number;
    patterns: number;
  };
  recommendations: { title: string; rationale: string; code: string }[];
}

/**
 * Full provenance:
 * Narrative -> Sections -> Scores/Patterns -> Rules -> Signals -> Observations
 * -> Questions -> Responses.
 */
export interface NarrativeTrace {
  narrative: Narrative;
  assessment: { id: string; organisationName: string; status: string };
  sections: {
    section: NarrativeSection;
    scores: {
      score: Score;
      patterns: {
        pattern: Pattern;
        rules: {
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
              answer: {
                value: number | string | null;
                label: string | null;
                answeredAt: string | null;
              };
            }[];
          }[];
        }[];
      }[];
    }[];
  }[];
  knowledgePackNarrative: {
    packId: string;
    packVersion: string;
    mode: NarrativeMode;
    provider: string;
    model: string;
    sections: { key: string; title: string; template: string; guidance: string }[];
  };
}

export interface NarrativeRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  mode: NarrativeMode;
  provider: string;
  model: string;
  sectionsRequested: number;
  sectionsGenerated: number;
  aiSections: number;
  templateSections: number;
  fallbacks: { sectionKey: string; reason: string }[];
  invalid: NarrativeValidationIssue[];
  durationMs: number;
}
