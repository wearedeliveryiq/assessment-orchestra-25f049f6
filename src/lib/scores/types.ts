import type {
  MaturityBand,
  OverallScoreDefinition,
  ScoreDefinition,
} from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { RuleResult } from "../rules/types";
import type { Signal } from "../signals/types";

export type { MaturityBand, ScoreDefinition, OverallScoreDefinition };

/**
 * The Score entity — an immutable, weighted quantification of organisational
 * capability within one assessment dimension, derived from Patterns only.
 */
export interface Score {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  scoreCode: string;
  dimension: string;
  overallScore: number;
  maximumScore: number;
  percentage: number;
  maturityLevel: string;
  confidence: number;
  severity: ObservationSeverity;
  weight: number;
  supportingPatternIds: string[];
  supportingPatternCodes: string[];
  calculationReason: string;
  scoreExpression: string;
  breakdown: ScoreBreakdown;
  createdAt: string;
}

/** Per-pattern contribution retained so a score can always be explained. */
export interface ScoreContribution {
  patternId: string;
  patternCode: string;
  patternName: string;
  severity: ObservationSeverity;
  confidence: number;
  /** Configured points before confidence/severity/weight scaling. */
  configuredImpact: number;
  severityMultiplier: number;
  /** Points actually applied to the dimension score. */
  appliedImpact: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  direction: "deduct" | "accrue";
  totalImpact: number;
  contributions: ScoreContribution[];
  confidence: {
    confidence: number;
    coverage: number;
    completeness: number;
    strength: number;
    weightFactor: number;
  };
}

/** Aggregate assessment score persisted alongside the dimension scores. */
export interface ScoreSummaryEntity {
  id: string;
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  overallScore: number;
  maximumScore: number;
  percentage: number;
  maturityLevel: string;
  confidence: number;
  dimensionCount: number;
  patternCount: number;
  breakdown: {
    weightingModel: string;
    totalWeight: number;
    dimensions: {
      scoreCode: string;
      dimension: string;
      percentage: number;
      weight: number;
      maturityLevel: string;
      confidence: number;
    }[];
  };
  createdAt: string;
}

/** Dashboard-ready payload: overall + dimensions + trend-ready points. */
export interface AssessmentScoreSummary {
  sessionId: string;
  assessment: { id: string; organisationName: string; status: string; completedAt: string | null };
  knowledgePack: string;
  knowledgePackVersion: string;
  overall: ScoreSummaryEntity | null;
  scores: Score[];
  /** Trend-ready series — one point per dimension plus the overall score. */
  trend: {
    capturedAt: string;
    scoreCode: string;
    dimension: string;
    percentage: number;
    maturityLevel: string;
    confidence: number;
  }[];
}

/**
 * Full provenance:
 * Score -> Patterns -> Rules -> Signals -> Observations -> Questions -> Responses.
 */
export interface ScoreTrace {
  score: Score;
  assessment: { id: string; organisationName: string; status: string };
  supportingPatterns: {
    pattern: Pattern;
    contribution: ScoreContribution | null;
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
  knowledgePackScore: {
    packId: string;
    packVersion: string;
    scoreCode: string;
    declaredPatterns: string[];
    weight: number;
    maximumScore: number;
    direction: "deduct" | "accrue";
    maturityBands: MaturityBand[];
    expression: string;
  };
}

export interface ScoreRunSummary {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  patternsConsidered: number;
  evaluated: number;
  calculated: number;
  invalid: { scoreCode: string; message: string }[];
  errored: { scoreCode: string; error: string }[];
  durationMs: number;
}
