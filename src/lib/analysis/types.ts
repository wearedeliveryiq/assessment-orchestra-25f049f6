import type { AnalysisRunStatus } from "../delivery-intelligence/lifecycle";

export const ANALYSIS_SCHEMA_VERSION = "deliveryiq.analysis-input/2.0.0";
export const ANALYSIS_ENGINE_VERSION = "deliveryiq.intelligence-engine/1.0.0";

export type AnalysisRequestedMode = "workspace" | "public";

export interface CanonicalAnalysisResponse {
  answerId: string;
  answerVersion: string;
  questionId: string;
  questionVersion: string;
  sectionId: string;
  value: string | number | null;
  status: "answered" | "not_applicable" | "excluded" | "missing";
  exclusionReason: string | null;
  respondentGroupId: string | null;
  evidenceAt: string | null;
}

export interface CanonicalAnalysisInput {
  schemaVersion: string;
  engineVersion: string;
  assessment: {
    sessionId: string;
    assessmentType: string;
    revision: number;
    organisationId: string;
    workspaceId: string;
    completedAt: string;
    consentBasis: string;
  };
  knowledgePack: { id: string; version: string; questionSetVersion: string };
  requestedMode: AnalysisRequestedMode;
  responses: CanonicalAnalysisResponse[];
}

export interface AssessmentAnalysisRun {
  id: string;
  assessmentSessionId: string;
  runtimeExecutionId: string;
  organisationId: string;
  workspaceId: string;
  createdByUserId: string;
  assessmentRevision: number;
  requestedMode: AnalysisRequestedMode;
  status: AnalysisRunStatus;
  attempt: number;
  knowledgePackId: string;
  knowledgePackVersion: string;
  questionSetVersion: string;
  configurationSetId: string;
  configurationVersion: string;
  configurationDigest: string;
  configurationSnapshot: Record<string, unknown>;
  schemaVersion: string;
  engineVersion: string;
  inputHash: string;
  idempotencyKey: string;
  responseCount: number;
  input: CanonicalAnalysisInput;
  initiator: { userId: string };
  consentBasis: string;
  correlationId: string;
  errorCode: string | null;
  safeErrorMessage: string | null;
  retryable: boolean | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalysisEventType =
  | "analysis.queued"
  | "analysis.started"
  | "analysis.completed"
  | "analysis.reused"
  | "analysis.failed"
  | "analysis.retry_scheduled";
