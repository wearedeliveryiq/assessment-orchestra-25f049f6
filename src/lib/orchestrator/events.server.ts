import type { AssessmentSession } from "../assessment/types";
import { lifecycleEvent, publishRuntimeEvent } from "../audit/runtime-audit.server";
import type { Execution, ExecutionStage, FailureClass } from "./types";

/**
 * ExecutionEventPublisher / ExecutionEventConsumer.
 *
 * The orchestrator publishes lifecycle events here and never writes audit rows
 * itself. Publishing is fire-and-forget: observability must never slow down or
 * fail a run. Consumers subscribe in-process (dashboard invalidation, metrics)
 * and can later be swapped for a queue-backed transport.
 */

export type ExecutionEventType =
  | "execution.queued"
  | "execution.started"
  | "execution.stage.started"
  | "execution.stage.completed"
  | "execution.stage.failed"
  | "execution.stage.skipped"
  | "execution.retry.started"
  | "execution.retry.completed"
  | "execution.paused"
  | "execution.cancelled"
  | "execution.completed"
  | "execution.failed";

export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  assessmentSessionId: string;
  ownerKey: string;
  correlationId: string;
  stageId?: string;
  attempt?: number;
  durationMs?: number;
  failureClass?: FailureClass;
  error?: string;
  payload?: Record<string, unknown>;
  at: string;
}

type Consumer = (event: ExecutionEvent) => void;

const consumers = new Set<Consumer>();

/** ExecutionEventConsumer registration. */
export function subscribeToExecutionEvents(consumer: Consumer): () => void {
  consumers.add(consumer);
  return () => consumers.delete(consumer);
}

function fanOut(event: ExecutionEvent): void {
  for (const consumer of consumers) {
    try {
      consumer(event);
    } catch (error) {
      console.error("[orchestrator] execution event consumer failed", error);
    }
  }
}

const SEVERITY: Partial<Record<ExecutionEventType, "info" | "warning" | "error">> = {
  "execution.stage.failed": "warning",
  "execution.failed": "error",
  "execution.cancelled": "warning",
  "execution.stage.skipped": "warning",
};

export function publishExecutionEvent(
  session: AssessmentSession,
  execution: Execution,
  type: ExecutionEventType,
  detail: Partial<Omit<ExecutionEvent, "type" | "at">> = {},
): void {
  const event: ExecutionEvent = {
    type,
    executionId: execution.id,
    assessmentSessionId: execution.assessmentSessionId,
    ownerKey: execution.ownerKey,
    correlationId: execution.correlationId,
    at: new Date().toISOString(),
    ...detail,
  };

  fanOut(event);

  // Audit & Explainability integration — every lifecycle event is auditable.
  publishRuntimeEvent(session, execution.ownerKey, {
    engine: "runtime",
    eventType: type,
    entityType: detail.stageId ? "stage" : "execution",
    entityId: detail.stageId ?? execution.id,
    severity: SEVERITY[type] ?? "info",
    durationMs: detail.durationMs,
    payload: {
      executionId: execution.id,
      pipeline: execution.pipelineId,
      pipelineVersion: execution.pipelineVersion,
      executionMode: execution.executionMode,
      correlationId: execution.correlationId,
      stage: detail.stageId,
      attempt: detail.attempt,
      failureClass: detail.failureClass,
      error: detail.error,
      ...detail.payload,
    },
  });
}

/** Assessment-level lifecycle passthrough (kept for existing audit consumers). */
export function publishAssessmentLifecycle(
  session: AssessmentSession,
  ownerKey: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): void {
  lifecycleEvent(session, ownerKey, eventType, payload);
}

export function stageEventDetail(stage: ExecutionStage): Partial<ExecutionEvent> {
  return { stageId: stage.stageId, attempt: stage.attempt, durationMs: stage.durationMs };
}
