/**
 * Shared, client-safe contracts for the DeliveryIQ Assessment Runtime.
 * No server-only imports may appear in this file.
 */

export type AssessmentStatus =
  "draft" | "in_progress" | "submitted" | "processing" | "completed" | "archived";

export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type EngineStageId =
  | "knowledge_pack"
  | "observations"
  | "signals"
  | "rules"
  | "patterns"
  | "scores"
  | "recommendations"
  | "narrative";

export interface AssessmentSession {
  id: string;
  organisationId: string;
  workspaceId: string;
  createdByUserId: string;
  organisationName: string;
  contactName: string | null;
  assessmentType: string;
  status: AssessmentStatus;
  currentSection: string | null;
  progress: number;
  metadata: Record<string, unknown>;
  failureReason: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assessmentRevision?: number;
  consentBasis?: string;
}

export interface AssessmentResponse {
  questionId: string;
  sectionId: string;
  value: string | number | null;
  score: number | null;
  notes: string | null;
  answeredAt: string;
  evidenceStatus?: "answered" | "not_applicable" | "excluded" | "missing";
  exclusionReason?: string | null;
  evidenceReasonCode?: string | null;
  evidenceReasonText?: string | null;
  respondentGroupId?: string | null;
  evidenceAt?: string | null;
}

export interface AssessmentAnswerInput {
  questionId: string;
  value: string | number | null;
  notes?: string | null;
  evidenceStatus?: "answered" | "not_applicable";
  evidenceReasonText?: string | null;
}

export interface StageRun {
  stage: EngineStageId;
  sequence: number;
  status: StageStatus;
  attempt: number;
  error: string | null;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AssessmentDetail {
  session: AssessmentSession;
  responses: AssessmentResponse[];
}

export interface RuntimeStatus {
  session: AssessmentSession;
  stages: StageRun[];
  nextStage: EngineStageId | null;
  isTerminal: boolean;
}

/* ---------- Engine output contracts ---------- */

export interface ObservationItem {
  id: string;
  sectionId: string;
  label: string;
  value: number;
  commentary: string;
}

export interface SignalItem {
  id: string;
  sectionId: string;
  strength: "strong" | "moderate" | "weak";
  direction: "positive" | "negative";
  statement: string;
}

export interface RuleHit {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
}

export interface PatternItem {
  id: string;
  name: string;
  confidence: number;
  description: string;
}

export interface SectionScore {
  sectionId: string;
  title: string;
  score: number;
  band: "leading" | "performing" | "developing" | "at-risk";
}

export interface ScoreSummary {
  overall: number;
  band: SectionScore["band"];
  sections: SectionScore[];
}

export interface RecommendationItem {
  id: string;
  horizon: "now" | "next" | "later";
  title: string;
  rationale: string;
  impact: "high" | "medium" | "low";
}

export interface NarrativeOutput {
  headline: string;
  summary: string;
  paragraphs: string[];
}

export interface AssessmentResults {
  generatedAt: string;
  observations: ObservationItem[];
  signals: SignalItem[];
  rules: RuleHit[];
  patterns: PatternItem[];
  scores: ScoreSummary;
  recommendations: RecommendationItem[];
  narrative: NarrativeOutput;
}
