import type { AssessmentResponse, AssessmentStatus, StageRun } from "../assessment/types";
import type { Narrative } from "../narrative/types";
import type { Observation, ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { Recommendation } from "../recommendations/types";
import type { RuleResult } from "../rules/types";
import type { Score, ScoreSummaryEntity } from "../scores/types";
import type { Signal } from "../signals/types";

/**
 * Client-safe dashboard contracts.
 *
 * The Executive Dashboard is a pure presentation layer: every figure below is
 * produced by the Intelligence Runtime and merely transported here. No file in
 * `src/lib/dashboard/*` or `src/components/dashboard/*` may derive a score,
 * confidence, severity, pattern or recommendation of its own.
 */

export interface DashboardAssessment {
  id: string;
  organisationName: string;
  contactName: string | null;
  assessmentType: string;
  status: AssessmentStatus;
  progress: number;
  createdAt: string;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface DashboardKnowledgePack {
  id: string;
  name: string;
  version: string;
}

/** One capability score card — pure selection over runtime output. */
export interface CapabilityCard {
  scoreId: string;
  scoreCode: string;
  dimension: string;
  percentage: number;
  overallScore: number;
  maximumScore: number;
  maturityLevel: string;
  confidence: number;
  /** Evidence coverage reported by the Scoring Engine breakdown. */
  evidenceCoverage: number;
  severity: ObservationSeverity;
  weight: number;
  supportingPatternCodes: string[];
  topPatternCode: string | null;
  topPatternName: string | null;
  topRecommendationCode: string | null;
  topRecommendationTitle: string | null;
}

export interface DashboardHealth {
  responses: number;
  observations: number;
  signals: number;
  rules: number;
  patterns: number;
  recommendations: number;
  dimensions: number;
  /** Overall evidence confidence reported by the Scoring Engine summary. */
  confidence: number;
}

export interface DashboardFilterOptions {
  capabilities: { value: string; label: string }[];
  severities: ObservationSeverity[];
  categories: string[];
  priorities: Recommendation["priority"][];
  horizons: Recommendation["horizon"][];
}

/** Consolidated payload served by GET /assessment/{id}/dashboard. */
export interface DashboardPayload {
  generatedAt: string;
  assessment: DashboardAssessment;
  knowledgePack: DashboardKnowledgePack;
  stages: StageRun[];
  narrative: Narrative | null;
  overall: ScoreSummaryEntity | null;
  capabilities: CapabilityCard[];
  scores: Score[];
  patterns: Pattern[];
  rules: RuleResult[];
  signals: Signal[];
  observations: Observation[];
  responses: AssessmentResponse[];
  recommendations: Recommendation[];
  health: DashboardHealth;
  filterOptions: DashboardFilterOptions;
  /** Non-fatal problems: the widget affected renders its own localised error. */
  warnings: { area: string; message: string }[];
}

export type DashboardExportFormat = "json" | "pdf" | "pptx" | "print";
