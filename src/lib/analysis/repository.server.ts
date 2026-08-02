/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssessmentAnalysisRun, CanonicalAnalysisInput } from "./types";

const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const runs = () => sb.from("assessment_analysis_runs");

type AnalysisRunRow = {
  id: string;
  assessment_session_id: string;
  runtime_execution_id: string;
  organisation_id: string;
  workspace_id: string;
  created_by_user_id: string;
  knowledge_pack_id: string;
  knowledge_pack_version: string;
  schema_version: string;
  model_version: string;
  input_hash: string;
  idempotency_key: string;
  response_count: number;
  canonical_input: CanonicalAnalysisInput;
  completed_at: string;
  created_at: string;
};

function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export function toAnalysisRun(row: AnalysisRunRow): AssessmentAnalysisRun {
  return {
    id: row.id,
    assessmentSessionId: row.assessment_session_id,
    runtimeExecutionId: row.runtime_execution_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    createdByUserId: row.created_by_user_id,
    knowledgePackId: row.knowledge_pack_id,
    knowledgePackVersion: row.knowledge_pack_version,
    schemaVersion: row.schema_version,
    modelVersion: row.model_version,
    inputHash: row.input_hash,
    idempotencyKey: row.idempotency_key,
    responseCount: row.response_count,
    input: row.canonical_input,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function findByIdempotencyKey(key: string): Promise<AssessmentAnalysisRun | null> {
  const result = await runs().select("*").eq("idempotency_key", key).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function latestForSession(sessionId: string): Promise<AssessmentAnalysisRun | null> {
  const result = await runs()
    .select("*")
    .eq("assessment_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function createRun(
  input: Omit<AssessmentAnalysisRun, "id" | "createdAt">,
): Promise<AssessmentAnalysisRun> {
  return toAnalysisRun(
    unwrap<AnalysisRunRow>(
      await runs()
        .insert({
          assessment_session_id: input.assessmentSessionId,
          runtime_execution_id: input.runtimeExecutionId,
          organisation_id: input.organisationId,
          workspace_id: input.workspaceId,
          created_by_user_id: input.createdByUserId,
          knowledge_pack_id: input.knowledgePackId,
          knowledge_pack_version: input.knowledgePackVersion,
          schema_version: input.schemaVersion,
          model_version: input.modelVersion,
          input_hash: input.inputHash,
          idempotency_key: input.idempotencyKey,
          response_count: input.responseCount,
          canonical_input: input.input,
          completed_at: input.completedAt,
        })
        .select("*")
        .single(),
    ),
  );
}
