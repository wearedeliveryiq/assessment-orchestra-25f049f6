import { getSession } from "../assessment/repository.server";
import { insertEvents } from "./repository.server";
import * as repo from "./repository.server";
import { AuditEventPublisher } from "./publisher.server";
import type {
  AuditDashboard,
  AuditDashboardFilters,
  AuditEvent,
  AuditEventInput,
  AuditEventPage,
  AuditQuery,
  AuditSeverity,
} from "./types";

/**
 * AuditService
 *
 * Single responsibility: the platform-wide façade for recording and reading
 * audit events. Every engine, dashboard and API talks to this service; no
 * component keeps its own audit trail.
 */

export class AuditServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Process-wide publisher. Delivery is asynchronous and retried, so a database
 * outage degrades auditing without ever failing an assessment run.
 */
export const auditPublisher = new AuditEventPublisher(
  (events: AuditEventInput[]) => insertEvents(events),
  { batchSize: 50, maxAttempts: 3, retryBaseMs: 50 },
);

/** Fire-and-forget recording used by every engine. Never throws. */
export function record(event: AuditEventInput): void {
  auditPublisher.publish(event);
}

export function recordAll(events: AuditEventInput[]): void {
  auditPublisher.publishAll(events);
}

/** Awaits delivery of everything published so far (tests, request teardown). */
export function flushAudit(): Promise<void> {
  return auditPublisher.flush();
}

export function auditHealth() {
  return {
    ...auditPublisher.stats,
    deadLetters: auditPublisher.deadLetterQueue.length,
  };
}

/* ----------------------------- authorisation ----------------------------- */

/** Organisation isolation: session-scoped audit reads require ownership. */
export async function assertSessionAccess(sessionId: string, ownerKey: string) {
  const session = await getSession(sessionId, ownerKey);
  if (!session) throw new AuditServiceError("Assessment not found", 404);
  return session;
}

/** Every access to audit data is itself audited. */
export function recordAuditAccess(input: {
  ownerKey: string;
  resource: string;
  assessmentSessionId?: string | null;
  filters?: Record<string, unknown>;
}): void {
  record({
    engine: "audit",
    eventType: "audit.accessed",
    entityType: "audit",
    entityId: input.resource,
    assessmentSessionId: input.assessmentSessionId ?? null,
    userId: input.ownerKey,
    organisationId: input.ownerKey,
    severity: "info",
    payload: { resource: input.resource, filters: input.filters ?? {} },
  });
}

/* -------------------------------- reads -------------------------------- */

export async function listEvents(query: AuditQuery, ownerKey: string): Promise<AuditEventPage> {
  if (query.assessmentSessionId) await assertSessionAccess(query.assessmentSessionId, ownerKey);
  recordAuditAccess({
    ownerKey,
    resource: query.assessmentSessionId ? `audit/${query.assessmentSessionId}` : "audit/events",
    assessmentSessionId: query.assessmentSessionId ?? null,
    filters: query as Record<string, unknown>,
  });
  return repo.queryEvents(query);
}

export async function getEventById(id: string, ownerKey: string): Promise<AuditEvent> {
  const event = await repo.getEvent(id);
  if (!event) throw new AuditServiceError("Audit event not found", 404);
  if (event.assessmentSessionId) {
    await assertSessionAccess(event.assessmentSessionId, ownerKey);
  } else if (event.organisationId && event.organisationId !== ownerKey) {
    throw new AuditServiceError("Audit event not found", 404);
  }
  recordAuditAccess({
    ownerKey,
    resource: `audit/event/${id}`,
    assessmentSessionId: event.assessmentSessionId,
  });
  return event;
}

/* ------------------------------ dashboard ------------------------------ */

function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const FAILURE_TYPES = new Set(["engine.failed", "validation.failed"]);

export async function buildDashboard(
  filters: AuditDashboardFilters,
  ownerKey: string,
): Promise<AuditDashboard> {
  if (filters.assessmentSessionId) await assertSessionAccess(filters.assessmentSessionId, ownerKey);

  // Organisation isolation: a caller may only ever see their own workspace.
  const scoped: AuditQuery = {
    ...filters,
    organisationId: filters.organisationId ?? ownerKey,
    includeArchived: false,
  };

  const events = await repo.scanEvents(scoped, 5000);
  recordAuditAccess({ ownerKey, resource: "audit/dashboard", filters: filters as Record<string, unknown> });

  const bySeverityMap = new Map<AuditSeverity, number>();
  const byEngineMap = new Map<string, { count: number; failures: number; durations: number[] }>();
  const byTypeMap = new Map<string, number>();
  const executionsMap = new Map<
    string,
    {
      executionId: string;
      assessmentSessionId: string | null;
      organisationId: string;
      timestamps: string[];
      engines: Set<string>;
      failed: boolean;
      durations: number[];
    }
  >();

  for (const event of events) {
    bySeverityMap.set(event.severity, (bySeverityMap.get(event.severity) ?? 0) + 1);
    byTypeMap.set(event.eventType, (byTypeMap.get(event.eventType) ?? 0) + 1);

    const engine = byEngineMap.get(event.engine) ?? { count: 0, failures: 0, durations: [] };
    engine.count += 1;
    if (FAILURE_TYPES.has(event.eventType)) engine.failures += 1;
    if (typeof event.durationMs === "number") engine.durations.push(event.durationMs);
    byEngineMap.set(event.engine, engine);

    if (event.executionId) {
      const execution = executionsMap.get(event.executionId) ?? {
        executionId: event.executionId,
        assessmentSessionId: event.assessmentSessionId,
        organisationId: event.organisationId,
        timestamps: [],
        engines: new Set<string>(),
        failed: false,
        durations: [],
      };
      execution.timestamps.push(event.timestamp);
      execution.engines.add(event.engine);
      if (FAILURE_TYPES.has(event.eventType)) execution.failed = true;
      if (typeof event.durationMs === "number") execution.durations.push(event.durationMs);
      executionsMap.set(event.executionId, execution);
    }
  }

  const executions = [...executionsMap.values()]
    .map((execution) => {
      const sorted = [...execution.timestamps].sort();
      const startedAt = sorted[0];
      const completedAt = sorted[sorted.length - 1] ?? null;
      return {
        executionId: execution.executionId,
        assessmentSessionId: execution.assessmentSessionId,
        organisationId: execution.organisationId,
        startedAt,
        completedAt,
        durationMs: execution.durations.reduce((sum, value) => sum + value, 0),
        engines: [...execution.engines],
        failed: execution.failed,
      };
    })
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 25);

  const durations = events
    .map((event) => event.durationMs)
    .filter((value): value is number => typeof value === "number");

  return {
    filters,
    totals: {
      events: events.length,
      validationFailures: events.filter((event) => event.eventType === "validation.failed").length,
      engineFailures: events.filter((event) => event.eventType === "engine.failed").length,
      assessments: new Set(
        events.map((event) => event.assessmentSessionId).filter(Boolean) as string[],
      ).size,
      averageDurationMs: averageOf(durations),
    },
    bySeverity: [...bySeverityMap.entries()]
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count),
    byEngine: [...byEngineMap.entries()]
      .map(([engine, value]) => ({
        engine,
        count: value.count,
        failures: value.failures,
        averageDurationMs: averageOf(value.durations),
      }))
      .sort((a, b) => b.count - a.count),
    byEventType: [...byTypeMap.entries()]
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count),
    executions,
    recentEvents: events.slice(0, 25),
    generatedAt: new Date().toISOString(),
  };
}
