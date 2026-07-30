import type { AssessmentSession, EngineStageId } from "../assessment/types";
import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import { persistSessionGraph } from "./graph-builder.server";
import { record } from "./service.server";
import type { AuditEngine, AuditEventInput, AuditSeverity } from "./types";

/**
 * Runtime audit adapter.
 *
 * The single place where the Intelligence Runtime publishes execution events.
 * Engines never write audit rows themselves; they simply run, and the runtime
 * controller reports what happened here. Every call is fire-and-forget.
 */

const STAGE_ENGINES: Record<string, AuditEngine> = {
  "knowledge-pack": "knowledge-pack",
  observations: "observations",
  signals: "signals",
  rules: "rules",
  patterns: "patterns",
  scores: "scores",
  recommendations: "recommendations",
  narrative: "narrative",
};

export function engineOf(stage: EngineStageId | string): AuditEngine {
  return STAGE_ENGINES[stage] ?? "runtime";
}

/** A stable id for one end-to-end processing run of an assessment. */
export function executionIdFor(session: AssessmentSession): string {
  return `${session.id}:${session.submittedAt ?? session.createdAt}`;
}

function packContext(): { knowledgePackId: string; knowledgePackVersion: string } {
  try {
    const pack = knowledgePackLoader.loadActive();
    return {
      knowledgePackId: pack.manifest.id,
      knowledgePackVersion: pack.manifest.version,
    };
  } catch {
    return { knowledgePackId: "", knowledgePackVersion: "" };
  }
}

export function runtimeContext(session: AssessmentSession, ownerKey: string) {
  return {
    assessmentSessionId: session.id,
    organisationId: ownerKey,
    userId: ownerKey,
    correlationId: session.id,
    executionId: executionIdFor(session),
    ...packContext(),
  };
}

export function publishRuntimeEvent(
  session: AssessmentSession,
  ownerKey: string,
  event: Omit<AuditEventInput, "engine"> & { engine?: AuditEngine },
): void {
  record({ engine: "runtime", ...runtimeContext(session, ownerKey), ...event });
}

export function engineStarted(
  session: AssessmentSession,
  ownerKey: string,
  stage: EngineStageId,
  attempt: number,
): void {
  publishRuntimeEvent(session, ownerKey, {
    engine: engineOf(stage),
    eventType: "engine.started",
    entityType: "stage",
    entityId: stage,
    severity: "info",
    payload: { stage, attempt },
  });
}

/** Event types emitted per stage when the engine produces domain entities. */
const ENTITY_EVENT: Record<string, { eventType: string; entityType: string }> = {
  observations: { eventType: "entity.created", entityType: "observation" },
  signals: { eventType: "entity.created", entityType: "signal" },
  rules: { eventType: "rule.evaluated", entityType: "rule" },
  patterns: { eventType: "pattern.detected", entityType: "pattern" },
  scores: { eventType: "entity.created", entityType: "score" },
  recommendations: { eventType: "recommendation.generated", entityType: "recommendation" },
  narrative: { eventType: "narrative.generated", entityType: "narrative" },
};

function outputSize(output: unknown): number | null {
  if (Array.isArray(output)) return output.length;
  if (output && typeof output === "object") return 1;
  return null;
}

export function engineCompleted(
  session: AssessmentSession,
  ownerKey: string,
  stage: EngineStageId,
  durationMs: number,
  output: unknown,
): void {
  const produced = outputSize(output);
  publishRuntimeEvent(session, ownerKey, {
    engine: engineOf(stage),
    eventType: "engine.completed",
    entityType: "stage",
    entityId: stage,
    severity: "info",
    durationMs,
    payload: { stage, produced },
  });

  const entity = ENTITY_EVENT[stage];
  if (entity && produced !== null && produced > 0) {
    publishRuntimeEvent(session, ownerKey, {
      engine: engineOf(stage),
      eventType: entity.eventType,
      entityType: entity.entityType,
      severity: "info",
      durationMs,
      payload: { stage, count: produced },
    });
  }
}

export function engineFailed(
  session: AssessmentSession,
  ownerKey: string,
  stage: EngineStageId,
  durationMs: number,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  publishRuntimeEvent(session, ownerKey, {
    engine: engineOf(stage),
    eventType: "engine.failed",
    entityType: "stage",
    entityId: stage,
    severity: "error",
    durationMs,
    payload: { stage, error: message },
  });
}

export function validationFailed(
  session: AssessmentSession,
  ownerKey: string,
  stage: EngineStageId,
  issues: unknown,
): void {
  publishRuntimeEvent(session, ownerKey, {
    engine: engineOf(stage),
    eventType: "validation.failed",
    entityType: "stage",
    entityId: stage,
    severity: "warning",
    payload: { stage, issues },
  });
}

export function lifecycleEvent(
  session: AssessmentSession,
  ownerKey: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  severity: AuditSeverity = "info",
): void {
  publishRuntimeEvent(session, ownerKey, {
    engine: "runtime",
    eventType,
    entityType: "assessment",
    entityId: session.id,
    severity,
    payload,
  });
}

/**
 * Rebuilds and persists the evidence graph after a stage. Runs in the
 * background: graph maintenance must never slow down or fail a run.
 */
export function scheduleGraphRefresh(sessionId: string): void {
  void persistSessionGraph(sessionId).catch((error) => {
    console.error("[audit] evidence graph refresh failed", error);
  });
}
