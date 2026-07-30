/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  AuditEvent,
  AuditEventInput,
  AuditEventPage,
  AuditQuery,
  AuditSeverity,
  EvidenceEntityType,
  ExplainabilityRecord,
  ExplainabilityRecordInput,
  RetentionPolicy,
} from "./types";

/**
 * AuditRepository
 *
 * Single responsibility: durable storage and retrieval of audit events,
 * explainability edges and retention policies. It contains no business rules —
 * publishing, graph construction and tracing live in their own services.
 *
 * The tables are server-only (not reachable from the browser), so the admin
 * client is used untyped and mapped into the domain model below.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };

const events = () => sb.from("audit_events");
const edges = () => sb.from("audit_explainability_edges");
const policies = () => sb.from("audit_retention_policies");

type EventRow = {
  id: string;
  timestamp: string;
  assessment_session_id: string | null;
  organisation_id: string;
  knowledge_pack_id: string;
  knowledge_pack_version: string;
  engine: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string;
  correlation_id: string;
  execution_id: string;
  severity: AuditSeverity;
  duration_ms: number | null;
  payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  archived_at: string | null;
  created_at: string;
};

type EdgeRow = {
  id: string;
  assessment_session_id: string;
  source_type: EvidenceEntityType;
  source_id: string;
  source_label: string;
  target_type: EvidenceEntityType;
  target_id: string;
  target_label: string;
  relationship_type: string;
  confidence: number | string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type PolicyRow = {
  id: string;
  name: string;
  scope: RetentionPolicy["scope"];
  scope_value: string;
  mode: RetentionPolicy["mode"];
  retain_days: number | null;
  enabled: boolean;
  description: string;
  last_applied_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toAuditEvent(row: EventRow): AuditEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    assessmentSessionId: row.assessment_session_id,
    organisationId: row.organisation_id,
    knowledgePackId: row.knowledge_pack_id,
    knowledgePackVersion: row.knowledge_pack_version,
    engine: row.engine as AuditEvent["engine"],
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    userId: row.user_id,
    correlationId: row.correlation_id,
    executionId: row.execution_id,
    severity: row.severity,
    durationMs: row.duration_ms,
    payload: row.payload ?? {},
    metadata: row.metadata ?? {},
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export function toExplainabilityRecord(row: EdgeRow): ExplainabilityRecord {
  return {
    id: row.id,
    assessmentSessionId: row.assessment_session_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceLabel: row.source_label,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    relationshipType: row.relationship_type,
    confidence: Number(row.confidence),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function toRetentionPolicy(row: PolicyRow): RetentionPolicy {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    scopeValue: row.scope_value,
    mode: row.mode,
    retainDays: row.retain_days,
    enabled: row.enabled,
    description: row.description,
    lastAppliedAt: row.last_applied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventPayload(input: AuditEventInput) {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    assessment_session_id: input.assessmentSessionId ?? null,
    organisation_id: input.organisationId ?? "",
    knowledge_pack_id: input.knowledgePackId ?? "",
    knowledge_pack_version: input.knowledgePackVersion ?? "",
    engine: input.engine,
    event_type: input.eventType,
    entity_type: input.entityType ?? "system",
    entity_id: input.entityId ?? null,
    user_id: input.userId ?? "",
    correlation_id: input.correlationId ?? "",
    execution_id: input.executionId ?? "",
    severity: input.severity ?? "info",
    duration_ms: input.durationMs ?? null,
    payload: input.payload ?? {},
    metadata: input.metadata ?? {},
  };
}

/** Bulk append. Audit rows are insert-only; nothing here ever updates a row. */
export async function insertEvents(inputs: AuditEventInput[]): Promise<AuditEvent[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await events().insert(inputs.map(eventPayload)).select();
  if (error) throw new Error(error.message);
  return (data as EventRow[]).map(toAuditEvent);
}

function applyFilters(builder: any, query: AuditQuery) {
  let q = builder;
  if (query.assessmentSessionId) q = q.eq("assessment_session_id", query.assessmentSessionId);
  if (query.organisationId) q = q.eq("organisation_id", query.organisationId);
  if (query.knowledgePackId) q = q.eq("knowledge_pack_id", query.knowledgePackId);
  if (query.engine) q = q.eq("engine", query.engine);
  if (query.eventType) q = q.eq("event_type", query.eventType);
  if (query.entityType) q = q.eq("entity_type", query.entityType);
  if (query.entityId) q = q.eq("entity_id", query.entityId);
  if (query.userId) q = q.eq("user_id", query.userId);
  if (query.correlationId) q = q.eq("correlation_id", query.correlationId);
  if (query.severity) q = q.eq("severity", query.severity);
  if (query.from) q = q.gte("timestamp", query.from);
  if (query.to) q = q.lte("timestamp", query.to);
  if (!query.includeArchived) q = q.is("archived_at", null);
  if (query.search) q = q.ilike("event_type", `%${query.search}%`);
  return q;
}

export const MAX_PAGE_SIZE = 200;

export async function queryEvents(query: AuditQuery = {}): Promise<AuditEventPage> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_PAGE_SIZE);
  const offset = Math.max(query.offset ?? 0, 0);

  const { data, error, count } = await applyFilters(
    events().select("*", { count: "exact" }),
    query,
  )
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  const rows = (data as EventRow[]) ?? [];
  const total = count ?? rows.length;
  return {
    events: rows.map(toAuditEvent),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

export async function getEvent(id: string): Promise<AuditEvent | null> {
  const { data, error } = await events().select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAuditEvent(data as EventRow) : null;
}

/** Unpaginated scan used by the dashboard aggregations (bounded by `limit`). */
export async function scanEvents(query: AuditQuery = {}, limit = 5000): Promise<AuditEvent[]> {
  const { data, error } = await applyFilters(events().select("*"), query)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as EventRow[]) ?? []).map(toAuditEvent);
}

/* --------------------------- explainability edges --------------------------- */

/** Idempotent append — replays of a stage do not duplicate relationships. */
export async function upsertEdges(
  inputs: ExplainabilityRecordInput[],
): Promise<ExplainabilityRecord[]> {
  if (inputs.length === 0) return [];
  const payload = inputs.map((edge) => ({
    assessment_session_id: edge.assessmentSessionId,
    source_type: edge.sourceType,
    source_id: edge.sourceId,
    source_label: edge.sourceLabel,
    target_type: edge.targetType,
    target_id: edge.targetId,
    target_label: edge.targetLabel,
    relationship_type: edge.relationshipType,
    confidence: edge.confidence,
    metadata: edge.metadata,
  }));

  const { data, error } = await edges()
    .upsert(payload, {
      onConflict:
        "assessment_session_id,source_type,source_id,target_type,target_id,relationship_type",
      ignoreDuplicates: true,
    })
    .select();

  if (error) throw new Error(error.message);
  return ((data as EdgeRow[]) ?? []).map(toExplainabilityRecord);
}

export async function listEdges(sessionId: string): Promise<ExplainabilityRecord[]> {
  const { data, error } = await edges()
    .select("*")
    .eq("assessment_session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20000);
  if (error) throw new Error(error.message);
  return ((data as EdgeRow[]) ?? []).map(toExplainabilityRecord);
}

export async function deleteEdges(sessionId: string): Promise<void> {
  const { error } = await edges().delete().eq("assessment_session_id", sessionId);
  if (error) throw new Error(error.message);
}

/* ------------------------------ retention ------------------------------ */

export async function listPolicies(): Promise<RetentionPolicy[]> {
  const { data, error } = await policies().select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as PolicyRow[]) ?? []).map(toRetentionPolicy);
}

export async function upsertPolicy(input: {
  name: string;
  scope?: RetentionPolicy["scope"];
  scopeValue?: string;
  mode: RetentionPolicy["mode"];
  retainDays?: number | null;
  enabled?: boolean;
  description?: string;
}): Promise<RetentionPolicy> {
  const { data, error } = await policies()
    .upsert(
      {
        name: input.name,
        scope: input.scope ?? "all",
        scope_value: input.scopeValue ?? "",
        mode: input.mode,
        retain_days: input.retainDays ?? null,
        enabled: input.enabled ?? true,
        description: input.description ?? "",
      },
      { onConflict: "name" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toRetentionPolicy(data as PolicyRow);
}

export async function markPolicyApplied(id: string): Promise<void> {
  const { error } = await policies()
    .update({ last_applied_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Marks matching events archived. Only `archived_at` may ever change. */
export async function archiveExpired(cutoff: string, filter: AuditQuery): Promise<number> {
  const rows = await scanEvents({ ...filter, to: cutoff }, 5000);
  const ids = rows.filter((row) => !row.archivedAt).map((row) => row.id);
  if (ids.length === 0) return 0;
  const { error } = await events()
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
  return ids.length;
}

export async function purgeExpired(cutoff: string, filter: AuditQuery): Promise<number> {
  const rows = await scanEvents({ ...filter, to: cutoff, includeArchived: true }, 5000);
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return 0;
  const { error } = await events().delete().in("id", ids);
  if (error) throw new Error(error.message);
  return ids.length;
}
