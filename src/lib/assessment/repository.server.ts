/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  AssessmentResponse,
  AssessmentResults,
  AssessmentSession,
  AssessmentStatus,
  EngineStageId,
  StageRun,
  StageStatus,
} from "./types";
import { ENGINE_STAGES } from "./stages";

/**
 * The generated Database types do not include these server-only tables
 * (they are unreachable from the browser), so the admin client is used
 * untyped here and mapped into the strongly typed domain models below.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };

const sessions = () => sb.from("assessment_sessions");
const responses = () => sb.from("assessment_responses");
const stageRuns = () => sb.from("assessment_stage_runs");

type SessionRow = {
  id: string;
  owner_key: string;
  organisation_name: string;
  contact_name: string | null;
  assessment_type: string;
  status: AssessmentStatus;
  current_section: string | null;
  progress: number;
  metadata: Record<string, unknown> | null;
  results: AssessmentResults | null;
  failure_reason: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type StageRow = {
  stage: EngineStageId;
  sequence: number;
  status: StageStatus;
  attempt: number;
  output: unknown;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
};

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export function toSession(row: SessionRow): AssessmentSession {
  return {
    id: row.id,
    organisationName: row.organisation_name,
    contactName: row.contact_name,
    assessmentType: row.assessment_type,
    status: row.status,
    currentSection: row.current_section,
    progress: row.progress,
    metadata: row.metadata ?? {},
    failureReason: row.failure_reason,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStageRun(row: StageRow): StageRun {
  return {
    stage: row.stage,
    sequence: row.sequence,
    status: row.status,
    attempt: row.attempt,
    error: row.error,
    durationMs: row.duration_ms,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export async function createSession(input: {
  ownerKey: string;
  organisationName: string;
  contactName?: string | null;
  assessmentType?: string;
}): Promise<AssessmentSession> {
  const row = unwrap<SessionRow>(
    await sessions()
      .insert({
        owner_key: input.ownerKey,
        organisation_name: input.organisationName,
        contact_name: input.contactName ?? null,
        assessment_type: input.assessmentType ?? "delivery-maturity",
        status: "draft",
      })
      .select()
      .single(),
  );
  return toSession(row);
}

export async function listSessions(ownerKey: string): Promise<AssessmentSession[]> {
  const rows = unwrap<SessionRow[]>(
    await sessions()
      .select("*")
      .eq("owner_key", ownerKey)
      .order("updated_at", { ascending: false })
      .limit(100),
  );
  return rows.map(toSession);
}

export async function getSession(id: string, ownerKey: string): Promise<AssessmentSession | null> {
  const row = unwrap<SessionRow | null>(
    await sessions().select("*").eq("id", id).eq("owner_key", ownerKey).maybeSingle(),
  );
  return row ? toSession(row) : null;
}

export async function getSessionResults(
  id: string,
  ownerKey: string,
): Promise<AssessmentResults | null> {
  const row = unwrap<{ results: AssessmentResults | null } | null>(
    await sessions().select("results").eq("id", id).eq("owner_key", ownerKey).maybeSingle(),
  );
  return row?.results ?? null;
}

export async function updateSession(
  id: string,
  patch: Record<string, unknown>,
): Promise<AssessmentSession> {
  const row = unwrap<SessionRow>(await sessions().update(patch).eq("id", id).select().single());
  return toSession(row);
}

export async function getResponses(sessionId: string): Promise<AssessmentResponse[]> {
  const rows = unwrap<
    {
      question_id: string;
      section_id: string;
      value: unknown;
      score: number | null;
      notes: string | null;
      answered_at: string;
    }[]
  >(await responses().select("*").eq("session_id", sessionId));

  return rows.map((row) => ({
    questionId: row.question_id,
    sectionId: row.section_id,
    value: (row.value as string | number | null) ?? null,
    score: row.score === null ? null : Number(row.score),
    notes: row.notes,
    answeredAt: row.answered_at,
  }));
}

export async function upsertResponses(
  sessionId: string,
  items: {
    questionId: string;
    sectionId: string;
    value: number | string | null;
    notes?: string | null;
  }[],
): Promise<void> {
  if (items.length === 0) return;
  const payload = items.map((item) => ({
    session_id: sessionId,
    question_id: item.questionId,
    section_id: item.sectionId,
    value: item.value,
    score: typeof item.value === "number" ? item.value : null,
    notes: item.notes ?? null,
    answered_at: new Date().toISOString(),
  }));
  const { error } = await responses().upsert(payload, { onConflict: "session_id,question_id" });
  if (error) throw new Error(error.message);
}

export async function resetStageRuns(sessionId: string): Promise<void> {
  const payload = ENGINE_STAGES.map((stage) => ({
    session_id: sessionId,
    stage: stage.id,
    sequence: stage.sequence,
    status: "pending",
    attempt: 0,
    output: null,
    error: null,
    started_at: null,
    completed_at: null,
    duration_ms: null,
  }));
  const { error } = await stageRuns().upsert(payload, { onConflict: "session_id,stage" });
  if (error) throw new Error(error.message);
}

export async function getStageRows(sessionId: string): Promise<StageRow[]> {
  return unwrap<StageRow[]>(
    await stageRuns().select("*").eq("session_id", sessionId).order("sequence"),
  );
}

export async function updateStageRun(
  sessionId: string,
  stage: EngineStageId,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await stageRuns()
    .update(patch)
    .eq("session_id", sessionId)
    .eq("stage", stage);
  if (error) throw new Error(error.message);
}
