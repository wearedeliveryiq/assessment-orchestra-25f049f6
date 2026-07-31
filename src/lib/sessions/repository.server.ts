import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { SessionErrors } from "./status";
import type {
  AssessmentSession,
  ParticipantRole,
  SessionHistoryEntry,
  SessionParticipant,
  SessionSearchFilter,
  SessionStatus,
  SessionTimelineEvent,
  UserSummary,
} from "./types";

/**
 * AssessmentSessionRepository — the single persistence boundary for session
 * lifecycle data. Services never speak SQL; swapping the storage engine only
 * requires reimplementing this module.
 */

type Row = Record<string, any>;

const db = () => supabaseAdmin as unknown as any;

const SESSIONS = "assessment_lifecycle_sessions";
const PARTICIPANTS = "assessment_session_participants";
const TIMELINE = "assessment_session_timeline";
const HISTORY = "assessment_session_history";

function fail(context: string, error: unknown): never {
  console.error(`[assessment-sessions-repository] ${context}`, error);
  throw SessionErrors.internal(error);
}

/* --------------------------------- mappers -------------------------------- */

export function toSession(row: Row): AssessmentSession {
  return {
    id: row.id,
    knowledgePackId: row.knowledge_pack_id,
    knowledgePackVersion: row.knowledge_pack_version ?? "",
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    assignedTo: row.assigned_to ?? null,
    runtimeSessionId: row.runtime_session_id ?? null,
    name: row.name,
    description: row.description ?? "",
    status: row.status as SessionStatus,
    priority: row.priority,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    progress: row.progress ?? 0,
    version: row.version ?? 1,
    parentSessionId: row.parent_session_id ?? null,
    rootSessionId: row.root_session_id ?? row.id,
    dueDate: row.due_date ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    pausedAt: row.paused_at ?? null,
    lastActivity: row.last_activity ?? row.created_at,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toParticipant(row: Row): SessionParticipant {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    role: row.role as ParticipantRole,
    addedBy: row.added_by ?? null,
    createdAt: row.created_at,
    user: null,
  };
}

function toTimelineEvent(row: Row): SessionTimelineEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? "",
    summary: row.summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toHistoryEntry(row: Row): SessionHistoryEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    changeType: row.change_type,
    field: row.field ?? "",
    previousValue: row.previous_value ?? null,
    nextValue: row.next_value ?? null,
    version: row.version ?? 1,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? "",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

/* --------------------------------- sessions -------------------------------- */

export async function insertSession(values: Row): Promise<AssessmentSession> {
  const { data, error } = await db().from(SESSIONS).insert(values).select("*").single();
  if (error) fail("insertSession", error);
  if (!data.root_session_id) {
    const patched = await db()
      .from(SESSIONS)
      .update({ root_session_id: data.id })
      .eq("id", data.id)
      .select("*")
      .single();
    if (patched.error) fail("insertSession.root", patched.error);
    return toSession(patched.data);
  }
  return toSession(data);
}

export async function getSession(id: string): Promise<AssessmentSession | null> {
  const { data, error } = await db().from(SESSIONS).select("*").eq("id", id).maybeSingle();
  if (error) fail("getSession", error);
  return data ? toSession(data) : null;
}

/**
 * Optimistic concurrency: the update only lands when the row still carries the
 * `updated_at` the caller read, so simultaneous edits surface as a conflict
 * rather than silently overwriting one another.
 */
export async function updateSession(
  id: string,
  patch: Row,
  expectedUpdatedAt?: string,
): Promise<AssessmentSession> {
  let query = db()
    .from(SESSIONS)
    .update({ ...patch, last_activity: patch.last_activity ?? new Date().toISOString() })
    .eq("id", id);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) fail("updateSession", error);
  if (!data) throw SessionErrors.concurrentUpdate();
  return toSession(data);
}

export async function searchSessions(
  filter: SessionSearchFilter & { organisationIds?: string[] | "all"; participantOf?: string[] },
): Promise<AssessmentSession[]> {
  let query = db().from(SESSIONS).select("*");

  if (filter.organisationIds && filter.organisationIds !== "all") {
    if (filter.organisationIds.length === 0) return [];
    query = query.in("organisation_id", filter.organisationIds);
  }
  if (filter.organisationId) query = query.eq("organisation_id", filter.organisationId);
  if (filter.workspaceId) query = query.eq("workspace_id", filter.workspaceId);
  if (filter.knowledgePackId) query = query.eq("knowledge_pack_id", filter.knowledgePackId);
  if (filter.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter.assignedTo) query = query.eq("assigned_to", filter.assignedTo);
  if (filter.status?.length) query = query.in("status", filter.status);
  if (filter.tags?.length) query = query.overlaps("tags", filter.tags);
  if (filter.dueBefore) query = query.lte("due_date", filter.dueBefore);
  if (filter.dueAfter) query = query.gte("due_date", filter.dueAfter);
  if (!filter.includeArchived && !filter.status?.includes("archived")) {
    query = query.neq("status", "archived");
  }
  if (filter.query) {
    const term = filter.query.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);

  const { data, error } = await query
    .order("last_activity", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) fail("searchSessions", error);
  return (data ?? []).map(toSession);
}

export async function listLineage(rootSessionId: string): Promise<AssessmentSession[]> {
  const { data, error } = await db()
    .from(SESSIONS)
    .select("*")
    .eq("root_session_id", rootSessionId)
    .order("version", { ascending: true });
  if (error) fail("listLineage", error);
  return (data ?? []).map(toSession);
}

export async function countLineage(rootSessionId: string): Promise<number> {
  const { count, error } = await db()
    .from(SESSIONS)
    .select("id", { count: "exact", head: true })
    .eq("root_session_id", rootSessionId);
  if (error) fail("countLineage", error);
  return count ?? 0;
}

export async function findOpenReassessment(parentSessionId: string): Promise<AssessmentSession | null> {
  const { data, error } = await db()
    .from(SESSIONS)
    .select("*")
    .eq("parent_session_id", parentSessionId)
    .not("status", "in", "(completed,archived)")
    .maybeSingle();
  if (error) fail("findOpenReassessment", error);
  return data ? toSession(data) : null;
}

/* ------------------------------- participants ------------------------------ */

export async function listParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const { data, error } = await db()
    .from(PARTICIPANTS)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) fail("listParticipants", error);
  return (data ?? []).map(toParticipant);
}

export async function listParticipantSessionIds(userId: string): Promise<string[]> {
  const { data, error } = await db()
    .from(PARTICIPANTS)
    .select("session_id")
    .eq("user_id", userId);
  if (error) fail("listParticipantSessionIds", error);
  return [...new Set((data ?? []).map((row: Row) => row.session_id as string))];
}

export async function addParticipant(values: {
  session_id: string;
  user_id: string;
  role: ParticipantRole;
  added_by: string | null;
}): Promise<void> {
  const { error } = await db().from(PARTICIPANTS).upsert(values, {
    onConflict: "session_id,user_id,role",
    ignoreDuplicates: true,
  });
  if (error) fail("addParticipant", error);
}

export async function removeParticipant(
  sessionId: string,
  userId: string,
  role?: ParticipantRole,
): Promise<void> {
  let query = db().from(PARTICIPANTS).delete().eq("session_id", sessionId).eq("user_id", userId);
  if (role) query = query.eq("role", role);
  const { error } = await query;
  if (error) fail("removeParticipant", error);
}

/* --------------------------------- timeline -------------------------------- */

export async function insertTimeline(values: Row): Promise<void> {
  const { error } = await db().from(TIMELINE).insert(values);
  if (error) console.error("[assessment-sessions-repository] insertTimeline", error);
}

export async function listTimeline(
  sessionId: string,
  options: { limit?: number; before?: string } = {},
): Promise<SessionTimelineEvent[]> {
  let query = db().from(TIMELINE).select("*").eq("session_id", sessionId);
  if (options.before) query = query.lt("created_at", options.before);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(Math.min(options.limit ?? 50, 200));
  if (error) fail("listTimeline", error);
  return (data ?? []).map(toTimelineEvent);
}

export async function listRecentTimeline(
  sessionIds: string[],
  limit = 20,
): Promise<SessionTimelineEvent[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await db()
    .from(TIMELINE)
    .select("*")
    .in("session_id", sessionIds.slice(0, 200))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listRecentTimeline", error);
  return (data ?? []).map(toTimelineEvent);
}

/* --------------------------------- history --------------------------------- */

export async function insertHistory(values: Row[]): Promise<void> {
  if (values.length === 0) return;
  const { error } = await db().from(HISTORY).insert(values);
  if (error) console.error("[assessment-sessions-repository] insertHistory", error);
}

export async function listHistory(
  sessionId: string,
  options: { limit?: number } = {},
): Promise<SessionHistoryEntry[]> {
  const { data, error } = await db()
    .from(HISTORY)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(Math.min(options.limit ?? 100, 500));
  if (error) fail("listHistory", error);
  return (data ?? []).map(toHistoryEntry);
}

/* --------------------------------- profiles -------------------------------- */

const profileCache = new Map<string, { value: UserSummary; expires: number }>();
const PROFILE_TTL_MS = 60_000;

/** Short-lived cache: dashboards resolve the same handful of users repeatedly. */
export async function resolveUsers(ids: (string | null | undefined)[]): Promise<Map<string, UserSummary>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const result = new Map<string, UserSummary>();
  const now = Date.now();
  const missing: string[] = [];

  for (const id of wanted) {
    const cached = profileCache.get(id);
    if (cached && cached.expires > now) result.set(id, cached.value);
    else missing.push(id);
  }
  if (missing.length === 0) return result;

  const { data, error } = await db()
    .from("identity_profiles")
    .select("id, email, display_name")
    .in("id", missing);
  if (error) {
    console.error("[assessment-sessions-repository] resolveUsers", error);
    return result;
  }
  for (const row of data ?? []) {
    const value: UserSummary = {
      id: row.id,
      email: row.email ?? "",
      displayName: row.display_name || row.email || "Unknown user",
    };
    result.set(row.id, value);
    profileCache.set(row.id, { value, expires: now + PROFILE_TTL_MS });
  }
  return result;
}

export async function organisationMemberIds(organisationId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("organisation_memberships")
    .select("user_id")
    .eq("organisation_id", organisationId)
    .eq("status", "active");
  if (error) fail("organisationMemberIds", error);
  return (data ?? []).map((row: Row) => row.user_id as string);
}
