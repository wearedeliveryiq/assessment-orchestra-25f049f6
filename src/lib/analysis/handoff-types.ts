import type { AnalysisRequestedMode } from "./types";

export type AnalysisHandoffStatus =
  "pending" | "processing" | "delivered" | "failed" | "ineligible";

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
  eligibilityDecisionId: string | null;
  lastErrorCode: string | null;
  nextAttemptAt: string;
  claimedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisEligibilityDecision {
  id: string;
  handoffId: string;
  assessmentSessionId: string;
  organisationId: string;
  workspaceId: string;
  assessmentRevision: number;
  configurationSetId: string;
  status: "eligible" | "ineligible";
  primaryReasonCode: string | null;
  secondaryReasonCodes: string[];
  correlationId: string;
  analysisRunId: string | null;
}

export interface AnalysisHandoffView {
  state: "preparing" | "queued" | "running" | "completed" | "failed" | "missing" | "ineligible";
  analysisRunId: string | null;
  retryable: boolean;
  completedAt: string | null;
  safeMessage: string;
  supportReference: string | null;
  canViewAssessment?: boolean;
  canStartDeliveryDna?: boolean;
}
