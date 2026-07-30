import * as assessmentRepo from "../assessment/repository.server";
import type { AssessmentSession, EngineStageId } from "../assessment/types";
import { resolveStageAdapter } from "./engine-adapters.server";
import { publishExecutionEvent } from "./events.server";
import { computeProgress } from "./progress";
import { backoffDelay, classifyFailure, delay, errorMessage, shouldRetry } from "./retry";
import * as repo from "./repository.server";
import { assertTransition } from "./state-machine";
import { resolvePipeline, stageById } from "./pipeline";
import type { Execution, ExecutionStage, PipelineDefinition, RetryPolicy } from "./types";

/**
 * ExecutionEngine — the single place where an assessment pipeline is advanced.
 *
 * Runs asynchronously: `startExecution` returns as soon as the run is accepted
 * and the loop continues in the background, persisting every state change so a
 * crashed or cancelled run can be resumed or retried without losing work.
 */

const HEARTBEAT_MS = 10_000;
const running = new Map<string, Promise<void>>();

export function isExecutionRunningLocally(executionId: string): boolean {
  return running.has(executionId);
}

/** Fire-and-forget launch of the background execution loop. */
export function launchExecution(executionId: string): void {
  if (running.has(executionId)) return;
  const task = runExecution(executionId).catch((error) => {
    console.error("[orchestrator] execution loop crashed", executionId, error);
  });
  running.set(
    executionId,
    task.finally(() => running.delete(executionId)),
  );
}

export async function awaitExecution(executionId: string): Promise<void> {
  await running.get(executionId);
}

async function heartbeat(executionId: string): Promise<void> {
  try {
    await repo.updateExecution(executionId, { heartbeat_at: new Date().toISOString() } as never);
  } catch (error) {
    console.error("[orchestrator] heartbeat failed", error);
  }
}

async function persistProgress(
  execution: Execution,
  stages: ExecutionStage[],
  currentStage: string | null,
): Promise<Execution> {
  const progress = computeProgress(stages);
  return repo.updateExecution(execution.id, {
    progress: progress.percentage,
    current_stage: currentStage,
    heartbeat_at: new Date().toISOString(),
  } as never);
}

function dependenciesSatisfied(stage: ExecutionStage, stages: ExecutionStage[]): boolean {
  return stage.dependsOn.every((dependency) => {
    const upstream = stages.find((candidate) => candidate.stageId === dependency);
    return upstream?.status === "completed" || upstream?.status === "skipped";
  });
}

function retryPolicyFor(pipeline: PipelineDefinition, stage: ExecutionStage): RetryPolicy {
  return stageById(pipeline, stage.stageId)?.retry ?? {
    maxAttempts: stage.maxAttempts,
    backoffMs: 1000,
    factor: 2,
    maxBackoffMs: 30_000,
  };
}

async function runExecution(executionId: string): Promise<void> {
  let execution = await repo.getExecution(executionId);
  if (!execution) return;

  const session = await assessmentRepo.getSession(
    execution.assessmentSessionId,
    execution.ownerKey,
  );
  if (!session) return;

  const pipeline = resolvePipeline();

  if (execution.status === "queued") {
    assertTransition(execution.status, "starting");
    execution = await repo.updateExecution(executionId, {
      status: "starting",
      started_at: execution.startedAt ?? new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
      error_message: null,
      failure_class: null,
    } as never);
    publishExecutionEvent(session, execution, "execution.started");
  }

  execution = await repo.updateExecution(executionId, { status: "running" } as never);
  await assessmentRepo.updateSession(session.id, { status: "processing", failure_reason: null });

  const timer = setInterval(() => void heartbeat(executionId), HEARTBEAT_MS);

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = await repo.getExecution(executionId);
      if (!current) return;
      execution = current;

      if (execution.cancelRequested) {
        await finishCancelled(execution, session);
        return;
      }

      const stages = await repo.getStages(executionId);
      const next = stages.find(
        (stage) => stage.status === "pending" && dependenciesSatisfied(stage, stages),
      );

      if (!next) {
        const blocked = stages.some((stage) => stage.status === "pending");
        const failed = stages.find((stage) => stage.status === "failed");
        if (failed || blocked) {
          await finishFailed(
            execution,
            session,
            stages,
            failed?.errorMessage ?? "Pipeline blocked — upstream stage did not complete",
            failed?.failureClass ?? "permanent",
          );
        } else {
          await finishCompleted(execution, session, stages);
        }
        return;
      }

      const outcome = await runStage(execution, session, pipeline, next);
      if (outcome === "cancelled") {
        await finishCancelled(execution, session);
        return;
      }
      if (outcome === "failed") {
        const refreshed = await repo.getStages(executionId);
        const failed = refreshed.find((stage) => stage.status === "failed");
        await finishFailed(
          execution,
          session,
          refreshed,
          failed?.errorMessage ?? "Stage failed",
          failed?.failureClass ?? "permanent",
        );
        return;
      }
    }
  } finally {
    clearInterval(timer);
  }
}

type StageOutcome = "completed" | "skipped" | "failed" | "cancelled";

async function runStage(
  execution: Execution,
  session: AssessmentSession,
  pipeline: PipelineDefinition,
  stage: ExecutionStage,
): Promise<StageOutcome> {
  const policy = retryPolicyFor(pipeline, stage);
  const optional = stageById(pipeline, stage.stageId)?.optional ?? false;
  const adapter = resolveStageAdapter(stage.engine);
  const retryHistory = [...stage.retryHistory];
  let attempt = stage.attempt;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const latest = await repo.getExecution(execution.id);
    if (latest?.cancelRequested) {
      await repo.updateStage(execution.id, stage.stageId, { status: "cancelled" } as never);
      return "cancelled";
    }

    attempt += 1;
    const startedAt = Date.now();
    const active = await repo.updateStage(execution.id, stage.stageId, {
      status: "running",
      attempt,
      started_at: new Date().toISOString(),
      error_message: null,
      failure_class: null,
    } as never);

    await persistProgress(execution, await repo.getStages(execution.id), stage.stageId);
    publishExecutionEvent(
      session,
      execution,
      attempt > 1 ? "execution.retry.started" : "execution.stage.started",
      { stageId: stage.stageId, attempt },
    );

    try {
      const result = await adapter.run({ session, ownerKey: execution.ownerKey });
      const durationMs = Date.now() - startedAt;

      await repo.updateStage(execution.id, stage.stageId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        retry_history: retryHistory,
      } as never);

      publishExecutionEvent(session, execution, "execution.stage.completed", {
        stageId: stage.stageId,
        attempt,
        durationMs,
        payload: { produced: result.produced },
      });
      if (attempt > 1) {
        publishExecutionEvent(session, execution, "execution.retry.completed", {
          stageId: stage.stageId,
          attempt,
          durationMs,
        });
      }

      await persistProgress(execution, await repo.getStages(execution.id), stage.stageId);
      return "completed";
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const failureClass = classifyFailure(error);
      const message = errorMessage(error);
      const retrying = shouldRetry(failureClass, attempt, policy);
      const backoffMs = retrying ? backoffDelay(attempt + 1, policy) : 0;

      retryHistory.push({
        attempt,
        at: new Date().toISOString(),
        failureClass,
        error: message,
        backoffMs,
      });

      publishExecutionEvent(session, execution, "execution.stage.failed", {
        stageId: stage.stageId,
        attempt,
        durationMs,
        failureClass,
        error: message,
        payload: { retrying, backoffMs },
      });

      if (retrying) {
        await repo.updateStage(execution.id, stage.stageId, {
          status: "pending",
          error_message: message,
          failure_class: failureClass,
          duration_ms: durationMs,
          retry_history: retryHistory,
        } as never);
        await repo.updateExecution(execution.id, {
          retry_count: execution.retryCount + retryHistory.length,
        } as never);
        await delay(backoffMs);
        continue;
      }

      if (optional) {
        await repo.updateStage(execution.id, stage.stageId, {
          status: "skipped",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          error_message: message,
          failure_class: failureClass,
          retry_history: retryHistory,
        } as never);
        publishExecutionEvent(session, execution, "execution.stage.skipped", {
          stageId: stage.stageId,
          attempt,
          error: message,
        });
        return "skipped";
      }

      await repo.updateStage(execution.id, stage.stageId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: message,
        failure_class: failureClass,
        retry_history: retryHistory,
      } as never);
      void active;
      return "failed";
    }
  }
}

/* --------------------------- terminal states --------------------------- */

async function finishCompleted(
  execution: Execution,
  session: AssessmentSession,
  stages: ExecutionStage[],
): Promise<void> {
  const durationMs = execution.startedAt ? Date.now() - Date.parse(execution.startedAt) : 0;
  assertTransition(execution.status, "completed");
  const updated = await repo.updateExecution(execution.id, {
    status: "completed",
    progress: 100,
    current_stage: null,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
    error_message: null,
    failure_class: null,
  } as never);
  void stages;
  publishExecutionEvent(session, updated, "execution.completed", { durationMs });
}

async function finishFailed(
  execution: Execution,
  session: AssessmentSession,
  stages: ExecutionStage[],
  message: string,
  failureClass: Execution["failureClass"],
): Promise<void> {
  const durationMs = execution.startedAt ? Date.now() - Date.parse(execution.startedAt) : 0;
  const progress = computeProgress(stages);
  const updated = await repo.updateExecution(execution.id, {
    status: "failed",
    progress: progress.percentage,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
    error_message: message,
    failure_class: failureClass,
  } as never);
  await assessmentRepo.updateSession(session.id, {
    status: "submitted",
    failure_reason: message,
  });
  publishExecutionEvent(session, updated, "execution.failed", {
    error: message,
    failureClass: failureClass ?? undefined,
    durationMs,
  });
}

async function finishCancelled(
  execution: Execution,
  session: AssessmentSession,
): Promise<void> {
  const stages = await repo.getStages(execution.id);
  for (const stage of stages) {
    if (stage.status === "pending" || stage.status === "running") {
      await repo.updateStage(execution.id, stage.stageId, { status: "cancelled" } as never);
    }
  }
  const updated = await repo.updateExecution(execution.id, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
    current_stage: null,
    duration_ms: execution.startedAt ? Date.now() - Date.parse(execution.startedAt) : 0,
  } as never);
  await assessmentRepo.updateSession(session.id, {
    status: "submitted",
    failure_reason: "Execution cancelled",
  });
  publishExecutionEvent(session, updated, "execution.cancelled");
}

/** Marks stages of a resumed execution so a retry re-runs only what is needed. */
export async function resetStagesForRetry(
  executionId: string,
  fromFailedOnly: boolean,
): Promise<void> {
  const stages = await repo.getStages(executionId);
  for (const stage of stages) {
    const shouldReset = fromFailedOnly
      ? stage.status !== "completed"
      : true;
    if (!shouldReset) continue;
    await repo.updateStage(executionId, stage.stageId, {
      status: "pending",
      attempt: 0,
      started_at: null,
      completed_at: null,
      duration_ms: 0,
      error_message: null,
      failure_class: null,
    } as never);
  }
  void (stages[0]?.engine as EngineStageId | undefined);
}
