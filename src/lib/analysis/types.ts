export const ANALYSIS_SCHEMA_VERSION = "1.0.0";
export const ANALYSIS_MODEL_VERSION = "deliveryiq.analysis-input/1.0.0";

export interface CanonicalAnalysisResponse {
  questionId: string;
  sectionId: string;
  value: string | number;
  score: number | null;
}

export interface CanonicalAnalysisInput {
  schemaVersion: string;
  modelVersion: string;
  assessment: {
    sessionId: string;
    assessmentType: string;
    organisationId: string;
    workspaceId: string;
    completedAt: string;
  };
  knowledgePack: { id: string; version: string };
  responses: CanonicalAnalysisResponse[];
}

export interface AssessmentAnalysisRun {
  id: string;
  assessmentSessionId: string;
  runtimeExecutionId: string;
  organisationId: string;
  workspaceId: string;
  createdByUserId: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  schemaVersion: string;
  modelVersion: string;
  inputHash: string;
  idempotencyKey: string;
  responseCount: number;
  input: CanonicalAnalysisInput;
  completedAt: string;
  createdAt: string;
}

export type AnalysisEventType =
  "analysis.started" | "analysis.completed" | "analysis.reused" | "analysis.failed";
