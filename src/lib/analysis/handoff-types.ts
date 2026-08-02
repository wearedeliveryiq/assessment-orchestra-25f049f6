import type { AnalysisRequestedMode } from "./types";

export type AnalysisHandoffStatus = "pending" | "processing" | "delivered" | "failed";

export interface AssessmentAnalysisHandoff {
  id: string;
  assessmentSessionId: string;
  organisationId: string;
  workspaceId: string;
  assessmentRevision: number;
  configurationSetId: string;
  requestedMode: AnalysisRequestedMode;
  status: AnalysisHandoffStatus;
  attempt: number;
  correlationId: string;
  analysisRunId: string | null;
  lastErrorCode: string | null;
  nextAttemptAt: string;
  claimedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisHandoffView {
  state: "preparing" | "queued" | "running" | "completed" | "failed" | "missing";
  analysisRunId: string | null;
  retryable: boolean;
  completedAt: string | null;
  safeMessage: string;
  supportReference: string | null;
}
