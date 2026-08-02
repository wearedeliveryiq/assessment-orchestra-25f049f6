/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssessmentAnalysisRun, CanonicalAnalysisInput } from "./types";

const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const runs = () => sb.from("assessment_analysis_runs");
const events = () => sb.from("assessment_analysis_events");

type AnalysisRunRow = Record<string, any> & { canonical_input: CanonicalAnalysisInput };

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
    assessmentRevision: row.assessment_revision,
    requestedMode: row.requested_mode,
    status: row.status,
    attempt: row.attempt,
    knowledgePackId: row.knowledge_pack_id,
    knowledgePackVersion: row.knowledge_pack_version,
    questionSetVersion: row.question_set_version,
    configurationSetId: row.configuration_set_id,
    configurationVersion: row.configuration_version,
    configurationDigest: row.configuration_digest,
    configurationSnapshot: row.configuration_snapshot,
    schemaVersion: row.schema_version,
    engineVersion: row.engine_version,
    inputHash: row.input_hash,
    idempotencyKey: row.idempotency_key,
    responseCount: row.response_count,
    input: row.canonical_input,
    initiator: row.initiator,
    consentBasis: row.consent_basis,
    correlationId: row.correlation_id,
    errorCode: row.error_code,
    safeErrorMessage: row.safe_error_message,
    retryable: row.retryable,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function scoped(query: any, tenant: { organisationId: string; workspaceId: string }) {
  return query.eq("organisation_id", tenant.organisationId).eq("workspace_id", tenant.workspaceId);
}

export async function findByIdempotencyKey(
  key: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<AssessmentAnalysisRun | null> {
  const result = await scoped(runs().select("*").eq("idempotency_key", key), tenant).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function getRun(
  id: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<AssessmentAnalysisRun | null> {
  const result = await scoped(runs().select("*").eq("id", id), tenant).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function latestForSession(
  sessionId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<AssessmentAnalysisRun | null> {
  const result = await scoped(runs().select("*").eq("assessment_session_id", sessionId), tenant)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function createRun(
  input: Omit<AssessmentAnalysisRun, "id" | "createdAt" | "updatedAt">,
): Promise<AssessmentAnalysisRun> {
  const row = unwrap<AnalysisRunRow>(
    await runs()
      .insert({
        assessment_session_id: input.assessmentSessionId,
        runtime_execution_id: input.runtimeExecutionId,
        organisation_id: input.organisationId,
        workspace_id: input.workspaceId,
        created_by_user_id: input.createdByUserId,
        assessment_revision: input.assessmentRevision,
        requested_mode: input.requestedMode,
        status: input.status,
        attempt: input.attempt,
        knowledge_pack_id: input.knowledgePackId,
        knowledge_pack_version: input.knowledgePackVersion,
        question_set_version: input.questionSetVersion,
        configuration_set_id: input.configurationSetId,
        configuration_version: input.configurationVersion,
        configuration_digest: input.configurationDigest,
        configuration_snapshot: input.configurationSnapshot,
        schema_version: input.schemaVersion,
        engine_version: input.engineVersion,
        input_hash: input.inputHash,
        idempotency_key: input.idempotencyKey,
        response_count: input.responseCount,
        canonical_input: input.input,
        initiator: input.initiator,
        consent_basis: input.consentBasis,
        correlation_id: input.correlationId,
        error_code: input.errorCode,
        safe_error_message: input.safeErrorMessage,
        retryable: input.retryable,
        queued_at: input.queuedAt,
      })
      .select("*")
      .single(),
  );
  return toAnalysisRun(row);
}

export async function appendEvent(
  run: AssessmentAnalysisRun,
  eventType: string,
  payload: Record<string, unknown>,
  severity = "info",
) {
  const { error } = await events().insert({
    analysis_run_id: run.id,
    organisation_id: run.organisationId,
    workspace_id: run.workspaceId,
    correlation_id: run.correlationId,
    event_type: eventType,
    severity,
    payload,
  });
  if (error) throw new Error(error.message);
}

export async function claimRun(
  id: string,
  leaseOwner: string,
  leaseExpiresAt: string,
): Promise<AssessmentAnalysisRun | null> {
  const result = await runs()
    .update({
      status: "running",
      attempt: 1,
      lease_owner: leaseOwner,
      lease_expires_at: leaseExpiresAt,
      started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "queued")
    .eq("attempt", 0)
    .select("*")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toAnalysisRun(result.data as AnalysisRunRow) : null;
}

export async function completeRun(id: string): Promise<AssessmentAnalysisRun> {
  return toAnalysisRun(
    unwrap<AnalysisRunRow>(
      await runs()
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", id)
        .eq("status", "running")
        .select("*")
        .single(),
    ),
  );
}

export async function failRun(
  id: string,
  error: { code: string; message: string; retryable: boolean },
): Promise<AssessmentAnalysisRun> {
  return toAnalysisRun(
    unwrap<AnalysisRunRow>(
      await runs()
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_code: error.code,
          safe_error_message: error.message,
          retryable: error.retryable,
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", id)
        .in("status", ["queued", "running"])
        .select("*")
        .single(),
    ),
  );
}
