import * as assessmentRepo from "../assessment/repository.server";
import type { AssessmentSession } from "../assessment/types";
import {
  awaitExecution,
  driveExecution,
  launchExecution,
  resetStagesForRetry,
} from "./executor.server";


import { publishExecutionEvent } from "./events.server";
import { DEFAULT_PIPELINE, resolvePipeline, stageById } from "./pipeline";
import { computeProgress } from "./progress";
import * as repo from "./repository.server";
import { isActive, isTerminal } from "./state-machine";
import { assertValid, validateExecutionRequest } from "./validator.server";
import {
  OrchestratorError,
  type Execution,
  type ExecutionHistoryFilters,
  type ExecutionMode,
  type ExecutionStatus,
  type ExecutionView,
  type RuntimeMonitorSnapshot,
} from "./types";

/**
 * RuntimeOrchestrator — the only entry point for executing the Intelligence
 * Runtime. UI and API code call this service; no caller ever invokes an
 * individual engine.
 */

const STALE_AFTER_MS = 90_000;

async function requireSession(
  sessionId: string,
  ownerKey: string,
): Promise<AssessmentSession> {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new OrchestratorError("Assessment not found", 404, "not_found");
  return session;
}

async function requireExecution(id: string, ownerKey: string): Promise<Execution> {
  const execution = await repo.getExecution(id, ownerKey);
  if (!execution) throw new OrchestratorError("Execution not found", 404, "not_found");
  return execution;
}

export async function toView(execution: Execution): Promise<ExecutionView> {
  const stages = await repo.getStages(execution.id);
  return {
    execution,
    stages,
    progress: computeProgress(stages),
    isTerminal: isTerminal(execution.status),
  };
}

/** POST /assessment/{id}/execute */
export async function execute(
  sessionId: string,
  ownerKey: string,
  options: { mode?: ExecutionMode; metadata?: Record<string, unknown> } = {},
): Promise<ExecutionView> {
  const session = await requireSession(sessionId, ownerKey);
  const pipeline = resolvePipeline();

  const existing = await repo.findActiveExecution(sessionId);
  if (existing) {
    // Idempotent: return the in-flight execution instead of starting a second.
    if (!isRunningStale(existing)) return toView(existing);
    await repo.updateExecution(existing.id, {
      status: "failed",
      error_message: "Execution abandoned — worker heartbeat lost",
      failure_class: "transient",
      completed_at: new Date().toISOString(),
    } as never);
  }

  const validation = await validateExecutionRequest({ session, pipeline, allowActive: true });
  assertValid(validation);

  await assessmentRepo.resetStageRuns(sessionId);
  await assessmentRepo.updateSession(sessionId, {
    status: "processing",
    failure_reason: null,
    results: null,
  });

  const execution = await repo.createExecution({
    assessmentSessionId: sessionId,
    ownerKey,
    organisationName: session.organisationName,
    knowledgePackId: validation.knowledgePackId,
    knowledgePackVersion: validation.knowledgePackVersion,
    pipeline,
    executionMode: options.mode ?? "manual",
    correlationId: crypto.randomUUID(),
    metadata: options.metadata,
  });

  publishExecutionEvent(session, execution, "execution.queued", {
    payload: { pipeline: pipeline.id, stages: pipeline.stages.length },
  });

  launchExecution(execution.id);
  return toView(execution);
}

function isRunningStale(execution: Execution): boolean {
  if (!isActive(execution.status)) return false;
  const beat = execution.heartbeatAt ?? execution.createdAt;
  return Date.now() - Date.parse(beat) > STALE_AFTER_MS;
}

/** GET /execution/{id} */
export async function getExecution(id: string, ownerKey: string): Promise<ExecutionView> {
  return toView(await requireExecution(id, ownerKey));
}

/** GET /execution/{id}/status — lightweight polling payload. */
export async function getStatus(id: string, ownerKey: string) {
  let execution = await requireExecution(id, ownerKey);

  // Serverless workers freeze background promises once a response is sent, so
  // polling drives the pipeline inside the request for a bounded budget. Each
  // poll advances as many stages as fit and persists them, guaranteeing
  // forward progress even when the worker is recycled between requests.
  if (isActive(execution.status)) {
    await driveExecution(execution.id, 6_000);
    execution = await requireExecution(id, ownerKey);
  }


  const stages = await repo.getStages(execution.id);
  const progress = computeProgress(stages);

  return {
    executionId: execution.id,
    assessmentSessionId: execution.assessmentSessionId,
    status: execution.status,
    progress,
    isTerminal: isTerminal(execution.status),
    errorMessage: execution.errorMessage,
    failureClass: execution.failureClass,
    retryCount: execution.retryCount,
    stages: stages.map((stage) => ({
      stageId: stage.stageId,
      label: stageById(DEFAULT_PIPELINE, stage.stageId)?.label ?? stage.stageId,
      status: stage.status,
      attempt: stage.attempt,
      durationMs: stage.durationMs,
      errorMessage: stage.errorMessage,
    })),
  };
}

/** POST /execution/{id}/cancel */
export async function cancel(id: string, ownerKey: string): Promise<ExecutionView> {
  const execution = await requireExecution(id, ownerKey);
  if (isTerminal(execution.status)) {
    throw new OrchestratorError(
      `Execution is already ${execution.status}`,
      409,
      "not_cancellable",
    );
  }
  const updated = await repo.updateExecution(execution.id, { cancel_requested: true } as never);
  return toView(updated);
}

/** POST /execution/{id}/retry — resumes from the failed stage, keeping responses. */
export async function retry(
  id: string,
  ownerKey: string,
  options: { fromStart?: boolean } = {},
): Promise<ExecutionView> {
  const execution = await requireExecution(id, ownerKey);
  if (!isTerminal(execution.status)) {
    throw new OrchestratorError("Execution is still running", 409, "not_retryable");
  }
  if (execution.status === "completed") {
    throw new OrchestratorError("Completed executions cannot be retried", 409, "not_retryable");
  }

  const session = await requireSession(execution.assessmentSessionId, ownerKey);
  await resetStagesForRetry(execution.id, !options.fromStart);

  const restarted = await repo.updateExecution(execution.id, {
    status: "queued",
    cancel_requested: false,
    error_message: null,
    failure_class: null,
    completed_at: null,
    heartbeat_at: new Date().toISOString(),
  } as never);

  await assessmentRepo.updateSession(session.id, {
    status: "processing",
    failure_reason: null,
  });

  publishExecutionEvent(session, restarted, "execution.queued", { payload: { retry: true } });
  launchExecution(restarted.id);
  return toView(restarted);
}

/** GET /execution/history */
export async function history(filters: ExecutionHistoryFilters): Promise<ExecutionView[]> {
  const executions = await repo.listHistory(filters);
  const stagesByExecution = await repo.listStagesForExecutions(executions.map((e) => e.id));
  return executions.map((execution) => {
    const stages = stagesByExecution[execution.id] ?? [];
    return {
      execution,
      stages,
      progress: computeProgress(stages),
      isTerminal: isTerminal(execution.status),
    };
  });
}

/** Latest execution for an assessment — used by the processing screen. */
export async function latestForSession(
  sessionId: string,
  ownerKey: string,
): Promise<ExecutionView | null> {
  await requireSession(sessionId, ownerKey);
  const [latest] = await repo.listExecutionsForSession(sessionId, ownerKey);
  return latest ? toView(latest) : null;
}

/** Runtime Monitor snapshot. */
export async function monitor(filters: ExecutionHistoryFilters): Promise<RuntimeMonitorSnapshot> {
  const views = await history({ ...filters, limit: filters.limit ?? 100 });
  const executions = views.map((view) => view.execution);

  const count = (status: ExecutionStatus) =>
    executions.filter((execution) => execution.status === status).length;

  const completed = executions.filter((e) => e.status === "completed");
  const failed = count("failed");
  const finished = completed.length + failed;
  const successRate = finished === 0 ? 1 : completed.length / finished;
  const averageDurationMs =
    completed.length === 0
      ? 0
      : Math.round(completed.reduce((sum, e) => sum + e.durationMs, 0) / completed.length);

  const timings = new Map<string, { runs: number; failures: number; retries: number; total: number }>();
  for (const view of views) {
    for (const stage of view.stages) {
      const entry = timings.get(stage.stageId) ?? { runs: 0, failures: 0, retries: 0, total: 0 };
      if (stage.status === "completed") {
        entry.runs += 1;
        entry.total += stage.durationMs;
      }
      if (stage.status === "failed") entry.failures += 1;
      entry.retries += stage.retryHistory.length;
      timings.set(stage.stageId, entry);
    }
  }

  const totalRetries = executions.reduce((sum, e) => sum + e.retryCount, 0);
  const pipelineHealth =
    successRate >= 0.9 ? "healthy" : successRate >= 0.6 ? "degraded" : "unhealthy";

  return {
    executions: views,
    metrics: {
      active: count("running") + count("starting"),
      queued: count("queued"),
      completed: completed.length,
      failed,
      cancelled: count("cancelled"),
      averageDurationMs,
      successRate,
      totalRetries,
      pipelineHealth,
    },
    stageTimings: DEFAULT_PIPELINE.stages.map((stage) => {
      const entry = timings.get(stage.id);
      return {
        stageId: stage.id,
        label: stage.label,
        runs: entry?.runs ?? 0,
        failures: entry?.failures ?? 0,
        retries: entry?.retries ?? 0,
        averageDurationMs: entry && entry.runs > 0 ? Math.round(entry.total / entry.runs) : 0,
      };
    }),
    filters: {
      organisations: [...new Set(executions.map((e) => e.organisationName))].sort(),
      knowledgePacks: [...new Set(executions.map((e) => e.knowledgePackId))].sort(),
    },
  };
}

/** Pipeline definition inspection (Runtime Monitor / extensibility checks). */
export async function inspectPipeline(sessionId: string, ownerKey: string) {
  const session = await requireSession(sessionId, ownerKey);
  const pipeline = resolvePipeline();
  const validation = await validateExecutionRequest({ session, pipeline });
  return { pipeline, validation };
}

/** Test hook: waits for an in-process execution loop to settle. */
export async function waitForExecution(id: string): Promise<void> {
  await awaitExecution(id);
}

/** Recovers executions abandoned by a crashed worker. */
export async function recoverStaleExecutions(): Promise<number> {
  const stale = await repo.findStaleExecutions(new Date(Date.now() - STALE_AFTER_MS).toISOString());
  for (const execution of stale) {
    await repo.updateExecution(execution.id, {
      status: "failed",
      error_message: "Execution abandoned — worker heartbeat lost",
      failure_class: "transient",
      completed_at: new Date().toISOString(),
    } as never);
  }
  return stale.length;
}

export { OrchestratorError };
