/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  Execution,
  ExecutionHistoryFilters,
  ExecutionMode,
  ExecutionStage,
  ExecutionStageStatus,
  ExecutionStatus,
  FailureClass,
  PipelineDefinition,
  PipelineEngineId,
  RetryAttempt,
} from "./types";

/**
 * ExecutionRepository — the only module that talks to the execution tables.
 * Execution history is append-only: rows are inserted and progressed, never
 * deleted or rewritten by application code.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const executions = () => sb.from("runtime_executions");
const stages = () => sb.from("runtime_execution_stages");

type ExecutionRow = {
  id: string;
  assessment_session_id: string;
  owner_key: string;
  organisation_name: string;
  knowledge_pack_id: string;
  knowledge_pack_version: string;
  pipeline_id: string;
  pipeline_version: string;
  status: ExecutionStatus;
  current_stage: string | null;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
  error_message: string | null;
  failure_class: FailureClass | null;
  retry_count: number;
  execution_mode: ExecutionMode;
  correlation_id: string;
  cancel_requested: boolean;
  heartbeat_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type StageRow = {
  id: string;
  execution_id: string;
  stage_id: string;
  engine: PipelineEngineId;
  sequence: number;
  depends_on: string[] | null;
  status: ExecutionStageStatus;
  attempt: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
  error_message: string | null;
  failure_class: FailureClass | null;
  retry_history: RetryAttempt[] | null;
};

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export function toExecution(row: ExecutionRow): Execution {
  return {
    id: row.id,
    assessmentSessionId: row.assessment_session_id,
    ownerKey: row.owner_key,
    organisationName: row.organisation_name,
    knowledgePackId: row.knowledge_pack_id,
    knowledgePackVersion: row.knowledge_pack_version,
    pipelineId: row.pipeline_id,
    pipelineVersion: row.pipeline_version,
    status: row.status,
    currentStage: row.current_stage,
    progress: row.progress,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    failureClass: row.failure_class,
    retryCount: row.retry_count,
    executionMode: row.execution_mode,
    correlationId: row.correlation_id,
    cancelRequested: row.cancel_requested,
    heartbeatAt: row.heartbeat_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStage(row: StageRow): ExecutionStage {
  return {
    id: row.id,
    executionId: row.execution_id,
    stageId: row.stage_id,
    engine: row.engine,
    sequence: row.sequence,
    dependsOn: row.depends_on ?? [],
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms ?? 0,
    errorMessage: row.error_message,
    failureClass: row.failure_class,
    retryHistory: row.retry_history ?? [],
  };
}

/* ------------------------------ writes ------------------------------ */

export async function createExecution(input: {
  assessmentSessionId: string;
  ownerKey: string;
  organisationName: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  pipeline: PipelineDefinition;
  executionMode: ExecutionMode;
  correlationId: string;
  metadata?: Record<string, unknown>;
}): Promise<Execution> {
  const execution = toExecution(
    unwrap<ExecutionRow>(
      await executions()
        .insert({
          assessment_session_id: input.assessmentSessionId,
          owner_key: input.ownerKey,
          organisation_name: input.organisationName,
          knowledge_pack_id: input.knowledgePackId,
          knowledge_pack_version: input.knowledgePackVersion,
          pipeline_id: input.pipeline.id,
          pipeline_version: input.pipeline.version,
          status: "queued",
          execution_mode: input.executionMode,
          correlation_id: input.correlationId,
          metadata: input.metadata ?? {},
        })
        .select("*")
        .single(),
    ),
  );

  const rows = input.pipeline.stages.map((s, index) => ({
    execution_id: execution.id,
    assessment_session_id: input.assessmentSessionId,
    stage_id: s.id,
    engine: s.engine,
    sequence: index + 1,
    depends_on: s.dependsOn,
    status: "pending",
    max_attempts: s.retry.maxAttempts,
  }));
  unwrap(await stages().insert(rows).select("id"));

  return execution;
}

export async function ensureCompletedCollectionExecution(input: {
  assessmentSessionId: string;
  ownerKey: string;
  organisationName: string;
  assessmentRevision: number;
  knowledgePackId: string;
  knowledgePackVersion: string;
  questionSetId: string;
  questionSetVersion: string;
  questionManifestDigest: string;
  configurationSetId: string;
}): Promise<Execution> {
  const existingRows = unwrap<ExecutionRow[]>(
    await executions()
      .select("*")
      .eq("assessment_session_id", input.assessmentSessionId)
      .eq("pipeline_id", "delivery-dna-collection")
      .eq("knowledge_pack_id", input.knowledgePackId)
      .eq("knowledge_pack_version", input.knowledgePackVersion)
      .eq("metadata->>assessmentRevision", String(input.assessmentRevision))
      .limit(1),
  );
  if (existingRows[0]) return toExecution(existingRows[0]);

  const completedAt = new Date().toISOString();
  const insert = await executions()
    .insert({
      assessment_session_id: input.assessmentSessionId,
      owner_key: input.ownerKey,
      organisation_name: input.organisationName,
      knowledge_pack_id: input.knowledgePackId,
      knowledge_pack_version: input.knowledgePackVersion,
      pipeline_id: "delivery-dna-collection",
      pipeline_version: "1.0.0",
      status: "completed",
      progress: 100,
      started_at: completedAt,
      completed_at: completedAt,
      heartbeat_at: completedAt,
      execution_mode: "triggered",
      correlation_id: crypto.randomUUID(),
      metadata: {
        assessmentRevision: input.assessmentRevision,
        questionSetId: input.questionSetId,
        questionSetVersion: input.questionSetVersion,
        questionManifestDigest: input.questionManifestDigest,
        configurationSetId: input.configurationSetId,
        purpose: "immutable-analysis-input-provenance",
      },
    })
    .select("*")
    .single();
  if (!insert.error) return toExecution(insert.data as ExecutionRow);

  // A concurrent double-submit may win the partial unique index. Re-read the
  // immutable record rather than creating a second provenance execution.
  const raced = unwrap<ExecutionRow | null>(
    await executions()
      .select("*")
      .eq("assessment_session_id", input.assessmentSessionId)
      .eq("pipeline_id", "delivery-dna-collection")
      .eq("knowledge_pack_id", input.knowledgePackId)
      .eq("knowledge_pack_version", input.knowledgePackVersion)
      .eq("metadata->>assessmentRevision", String(input.assessmentRevision))
      .maybeSingle(),
  );
  if (!raced) throw new Error(insert.error.message);
  return toExecution(raced);
}

export async function updateExecution(
  id: string,
  patch: Partial<ExecutionRow>,
): Promise<Execution> {
  return toExecution(
    unwrap<ExecutionRow>(await executions().update(patch).eq("id", id).select("*").single()),
  );
}

export async function updateStage(
  executionId: string,
  stageId: string,
  patch: Partial<StageRow>,
): Promise<ExecutionStage> {
  return toStage(
    unwrap<StageRow>(
      await stages()
        .update(patch)
        .eq("execution_id", executionId)
        .eq("stage_id", stageId)
        .select("*")
        .single(),
    ),
  );
}

/* ------------------------------ reads ------------------------------ */

export async function getExecution(id: string, ownerKey?: string): Promise<Execution | null> {
  let query = executions().select("*").eq("id", id);
  if (ownerKey) query = query.eq("owner_key", ownerKey);
  const row = unwrap<ExecutionRow | null>(await query.maybeSingle());
  return row ? toExecution(row) : null;
}

export async function getStages(executionId: string): Promise<ExecutionStage[]> {
  const rows = unwrap<StageRow[]>(
    await stages().select("*").eq("execution_id", executionId).order("sequence"),
  );
  return (rows ?? []).map(toStage);
}

export async function listExecutionsForSession(
  sessionId: string,
  ownerKey: string,
): Promise<Execution[]> {
  const rows = unwrap<ExecutionRow[]>(
    await executions()
      .select("*")
      .eq("assessment_session_id", sessionId)
      .eq("owner_key", ownerKey)
      .order("created_at", { ascending: false }),
  );
  return (rows ?? []).map(toExecution);
}

export async function findActiveExecution(sessionId: string): Promise<Execution | null> {
  const rows = unwrap<ExecutionRow[]>(
    await executions()
      .select("*")
      .eq("assessment_session_id", sessionId)
      .in("status", ["queued", "starting", "running", "paused"])
      .order("created_at", { ascending: false })
      .limit(1),
  );
  return rows?.[0] ? toExecution(rows[0]) : null;
}

export async function listHistory(filters: ExecutionHistoryFilters): Promise<Execution[]> {
  let query = executions()
    .select("*")
    .eq("owner_key", filters.ownerKey)
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 500));

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.knowledgePackId) query = query.eq("knowledge_pack_id", filters.knowledgePackId);
  if (filters.organisationName) query = query.eq("organisation_name", filters.organisationName);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const rows = unwrap<ExecutionRow[]>(await query);
  return (rows ?? []).map(toExecution);
}

/** The pinned model execution that produced a completed assessment. */
export async function findCompletedExecutionForSession(
  sessionId: string,
  ownerKey: string,
): Promise<Execution | null> {
  const rows = unwrap<ExecutionRow[]>(
    await executions()
      .select("*")
      .eq("assessment_session_id", sessionId)
      .eq("owner_key", ownerKey)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1),
  );
  return rows?.[0] ? toExecution(rows[0]) : null;
}

export async function listStagesForExecutions(
  executionIds: string[],
): Promise<Record<string, ExecutionStage[]>> {
  if (executionIds.length === 0) return {};
  const rows = unwrap<StageRow[]>(
    await stages().select("*").in("execution_id", executionIds).order("sequence"),
  );
  const grouped: Record<string, ExecutionStage[]> = {};
  for (const row of rows ?? []) {
    (grouped[row.execution_id] ??= []).push(toStage(row));
  }
  return grouped;
}

/** Executions left mid-flight by a crashed or restarted worker. */
export async function findStaleExecutions(staleBeforeIso: string): Promise<Execution[]> {
  const rows = unwrap<ExecutionRow[]>(
    await executions()
      .select("*")
      .in("status", ["starting", "running"])
      .lt("heartbeat_at", staleBeforeIso)
      .order("heartbeat_at", { ascending: true })
      .limit(25),
  );
  return (rows ?? []).map(toExecution);
}
