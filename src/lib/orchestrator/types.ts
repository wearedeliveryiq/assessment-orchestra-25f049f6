import type { EngineStageId } from "../assessment/types";

/* ------------------------------------------------------------------ *
 * Execution states
 * ------------------------------------------------------------------ */

export type ExecutionStatus =
  | "queued"
  | "starting"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export type ExecutionMode = "manual" | "scheduled" | "batch" | "triggered";

export type FailureClass = "transient" | "permanent";

/* ------------------------------------------------------------------ *
 * Pipeline definition (configuration, never hard-coded execution)
 * ------------------------------------------------------------------ */

/** Engines the orchestrator may invoke. `dashboard_refresh` is a runtime stage. */
export type PipelineEngineId = EngineStageId | "dashboard_refresh";

export interface RetryPolicy {
  /** Total attempts allowed for the stage, including the first one. */
  maxAttempts: number;
  /** Delay before the second attempt, in milliseconds. */
  backoffMs: number;
  /** Multiplier applied to the delay on each subsequent attempt. */
  factor: number;
  /** Upper bound for a single backoff delay. */
  maxBackoffMs: number;
}

export interface PipelineStageDefinition {
  id: string;
  engine: PipelineEngineId;
  label: string;
  description: string;
  /** Stage ids that must complete before this stage may run. */
  dependsOn: string[];
  /** An optional stage that fails is skipped instead of failing the run. */
  optional?: boolean;
  retry: RetryPolicy;
}

export interface PipelineDefinition {
  id: string;
  version: string;
  label: string;
  stages: PipelineStageDefinition[];
}

/* ------------------------------------------------------------------ *
 * Execution entity
 * ------------------------------------------------------------------ */

export interface ExecutionStage {
  id: string;
  executionId: string;
  stageId: string;
  engine: PipelineEngineId;
  sequence: number;
  dependsOn: string[];
  status: ExecutionStageStatus;
  attempt: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
  failureClass: FailureClass | null;
  retryHistory: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  at: string;
  failureClass: FailureClass;
  error: string;
  backoffMs: number;
}

export interface Execution {
  id: string;
  assessmentSessionId: string;
  ownerKey: string;
  organisationName: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  pipelineId: string;
  pipelineVersion: string;
  status: ExecutionStatus;
  currentStage: string | null;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
  failureClass: FailureClass | null;
  retryCount: number;
  executionMode: ExecutionMode;
  correlationId: string;
  cancelRequested: boolean;
  heartbeatAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionProgress {
  percentage: number;
  completed: number;
  total: number;
  currentStage: string | null;
  estimatedCompletionAt: string | null;
  estimatedRemainingMs: number | null;
}

export interface ExecutionView {
  execution: Execution;
  stages: ExecutionStage[];
  progress: ExecutionProgress;
  isTerminal: boolean;
}

export interface ExecutionHistoryFilters {
  ownerKey: string;
  organisationName?: string;
  knowledgePackId?: string;
  status?: ExecutionStatus;
  from?: string;
  to?: string;
  limit?: number;
}

export interface RuntimeMonitorSnapshot {
  executions: ExecutionView[];
  metrics: {
    active: number;
    queued: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageDurationMs: number;
    successRate: number;
    totalRetries: number;
    pipelineHealth: "healthy" | "degraded" | "unhealthy";
  };
  stageTimings: {
    stageId: string;
    label: string;
    runs: number;
    failures: number;
    retries: number;
    averageDurationMs: number;
  }[];
  filters: {
    organisations: string[];
    knowledgePacks: string[];
  };
}

/** Thrown by the orchestrator; maps directly onto an HTTP status. */
export class OrchestratorError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "orchestrator_error",
  ) {
    super(message);
  }
}
