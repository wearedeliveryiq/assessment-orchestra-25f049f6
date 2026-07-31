/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { RuntimeStore } from "./store";
import type {
  AssessmentPublishedPayload,
  ResponseRecord,
  RuntimeEvent,
  RuntimeSession,
} from "./types";

/**
 * Supabase-backed persistence for the Assessment Runtime. Runtime tables are
 * server-only (reached exclusively through the REST layer), so the admin client
 * is used untyped and mapped into strongly typed domain models here.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };

const sessions = () => sb.from("runtime_assessment_sessions");
const responses = () => sb.from("runtime_assessment_responses");
const events = () => sb.from("runtime_assessment_events");

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

type SessionRow = {
  id: string;
  pack_id: string;
  pack_version: string;
  assessment_id: string;
  name: string;
  status: RuntimeSession["status"];
  current_section_id: string | null;
  current_page_id: string | null;
  answered_count: number;
  total_questions: number;
  progress: number;
  locked: boolean;
  started_at: string;
  last_saved_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
  payload: AssessmentPublishedPayload | null;
};

function toSession(row: SessionRow): RuntimeSession {
  return {
    id: row.id,
    packId: row.pack_id,
    packVersion: row.pack_version,
    assessmentId: row.assessment_id,
    name: row.name,
    status: row.status,
    currentSectionId: row.current_section_id,
    currentPageId: row.current_page_id,
    answeredCount: row.answered_count,
    totalQuestions: row.total_questions,
    progress: row.progress,
    locked: row.locked,
    startedAt: row.started_at,
    lastSavedAt: row.last_saved_at,
    completedAt: row.completed_at,
    metadata: row.metadata ?? {},
  };
}

export class SupabaseRuntimeStore implements RuntimeStore {
  async createSession(input: { ownerKey: string; session: Omit<RuntimeSession, "id"> }) {
    const s = input.session;
    const row = unwrap<SessionRow>(
      await sessions()
        .insert({
          owner_key: input.ownerKey,
          pack_id: s.packId,
          pack_version: s.packVersion,
          assessment_id: s.assessmentId,
          name: s.name,
          status: s.status,
          current_section_id: s.currentSectionId,
          current_page_id: s.currentPageId,
          answered_count: s.answeredCount,
          total_questions: s.totalQuestions,
          progress: s.progress,
          locked: s.locked,
          started_at: s.startedAt,
          metadata: s.metadata,
        })
        .select()
        .single(),
    );
    return toSession(row);
  }

  async getSession(id: string, ownerKey: string) {
    const result = await sessions()
      .select("*")
      .eq("id", id)
      .eq("owner_key", ownerKey)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data ? toSession(result.data as SessionRow) : null;
  }

  async listSessions(ownerKey: string) {
    const rows = unwrap<SessionRow[]>(
      await sessions()
        .select("*")
        .eq("owner_key", ownerKey)
        .order("started_at", { ascending: false })
        .limit(100),
    );
    return rows.map(toSession);
  }

  async updateSession(id: string, patch: Partial<RuntimeSession>) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.currentSectionId !== undefined) row.current_section_id = patch.currentSectionId;
    if (patch.currentPageId !== undefined) row.current_page_id = patch.currentPageId;
    if (patch.answeredCount !== undefined) row.answered_count = patch.answeredCount;
    if (patch.progress !== undefined) row.progress = patch.progress;
    if (patch.locked !== undefined) row.locked = patch.locked;
    if (patch.lastSavedAt !== undefined) row.last_saved_at = patch.lastSavedAt;
    if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
    if (patch.metadata !== undefined) row.metadata = patch.metadata;

    return toSession(
      unwrap<SessionRow>(await sessions().update(row).eq("id", id).select().single()),
    );
  }

  async getResponses(sessionId: string): Promise<ResponseRecord[]> {
    const rows = unwrap<
      {
        question_id: string;
        section_id: string;
        page_id: string;
        value: ResponseRecord["value"];
        valid: boolean;
        updated_at: string;
      }[]
    >(await responses().select("*").eq("session_id", sessionId).limit(5000));
    return rows.map((row) => ({
      questionId: row.question_id,
      sectionId: row.section_id,
      pageId: row.page_id,
      value: row.value ?? null,
      valid: row.valid,
      updatedAt: row.updated_at,
    }));
  }

  async upsertResponses(sessionId: string, records: ResponseRecord[]) {
    if (records.length === 0) return;
    const result = await responses().upsert(
      records.map((record) => ({
        session_id: sessionId,
        question_id: record.questionId,
        section_id: record.sectionId,
        page_id: record.pageId,
        value: record.value,
        valid: record.valid,
        updated_at: record.updatedAt,
      })),
      { onConflict: "session_id,question_id" },
    );
    if (result.error) throw new Error(result.error.message);
  }

  async recordEvent(input: {
    sessionId: string;
    ownerKey: string;
    type: RuntimeEvent["type"];
    payload: Record<string, unknown>;
  }) {
    const row = unwrap<{
      id: string;
      session_id: string;
      type: RuntimeEvent["type"];
      payload: Record<string, unknown> | null;
      created_at: string;
    }>(
      await events()
        .insert({
          session_id: input.sessionId,
          owner_key: input.ownerKey,
          type: input.type,
          payload: input.payload,
        })
        .select()
        .single(),
    );
    return {
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    };
  }

  async listEvents(sessionId: string, limit = 100) {
    const rows = unwrap<
      {
        id: string;
        session_id: string;
        type: RuntimeEvent["type"];
        payload: Record<string, unknown> | null;
        created_at: string;
      }[]
    >(
      await events()
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    }));
  }

  async savePayload(sessionId: string, payload: AssessmentPublishedPayload) {
    const result = await sessions().update({ payload }).eq("id", sessionId);
    if (result.error) throw new Error(result.error.message);
  }

  async getPayload(sessionId: string) {
    const result = await sessions().select("payload").eq("id", sessionId).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return ((result.data as { payload: AssessmentPublishedPayload | null } | null)?.payload ??
      null) as AssessmentPublishedPayload | null;
  }
}
