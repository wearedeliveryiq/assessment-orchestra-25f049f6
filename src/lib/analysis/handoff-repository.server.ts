/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssessmentSession } from "../assessment/types";
import type { AssessmentAnalysisHandoff } from "./handoff-types";

const sb = supabaseAdmin as unknown as {
  from: (table: string) => any;
  rpc: (name: string, parameters: Record<string, unknown>) => Promise<any>;
};
const handoffs = () => sb.from("assessment_analysis_handoffs");
const events = () => sb.from("assessment_analysis_handoff_events");

type HandoffRow = Record<string, any>;

function toHandoff(row: HandoffRow): AssessmentAnalysisHandoff {
  return {
    id: row.id,
    assessmentSessionId: row.assessment_session_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    assessmentRevision: row.assessment_revision,
    configurationSetId: row.configuration_set_id,
    requestedMode: row.requested_mode,
    status: row.status,
    attempt: row.attempt,
    correlationId: row.correlation_id,
    analysisRunId: row.analysis_run_id,
    lastErrorCode: row.last_error_code,
    nextAttemptAt: row.next_attempt_at,
    claimedAt: row.claimed_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function unwrapRow(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("ANALYSIS_HANDOFF_NOT_FOUND");
  return toHandoff(row as HandoffRow);
}

export async function ensureHandoff(
  session: AssessmentSession,
): Promise<AssessmentAnalysisHandoff> {
  const result = await handoffs()
    .upsert(
      {
        assessment_session_id: session.id,
        organisation_id: session.organisationId,
        workspace_id: session.workspaceId,
        assessment_revision: session.assessmentRevision,
        configuration_set_id: "sprint03-product-config-1.0.0",
        requested_mode: "workspace",
      },
      {
        onConflict: "assessment_session_id,assessment_revision,configuration_set_id,requested_mode",
        ignoreDuplicates: false,
      },
    )
    .select("*")
    .single();
  return unwrapRow(result);
}

export async function getHandoff(
  assessmentSessionId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<AssessmentAnalysisHandoff | null> {
  const result = await handoffs()
    .select("*")
    .eq("assessment_session_id", assessmentSessionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toHandoff(result.data as HandoffRow) : null;
}

export async function claimHandoffs(limit = 10): Promise<AssessmentAnalysisHandoff[]> {
  const result = await sb.rpc("claim_assessment_analysis_handoffs", { p_limit: limit });
  if (result.error) throw new Error(result.error.message);
  return ((result.data ?? []) as HandoffRow[]).map(toHandoff);
}

export async function claimHandoff(id: string): Promise<AssessmentAnalysisHandoff | null> {
  const result = await sb.rpc("claim_assessment_analysis_handoff", { p_handoff_id: id });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? toHandoff(row as HandoffRow) : null;
}

export async function completeHandoff(id: string, runId: string) {
  return unwrapRow(
    await sb.rpc("complete_assessment_analysis_handoff", {
      p_handoff_id: id,
      p_analysis_run_id: runId,
    }),
  );
}

export async function failHandoff(id: string, safeErrorCode: string) {
  return unwrapRow(
    await sb.rpc("fail_assessment_analysis_handoff", {
      p_handoff_id: id,
      p_safe_error_code: safeErrorCode,
    }),
  );
}

export async function reconcileHandoffs(limit = 100): Promise<number> {
  const result = await sb.rpc("reconcile_assessment_analysis_handoffs", { p_limit: limit });
  if (result.error) throw new Error(result.error.message);
  return Number(result.data ?? 0);
}

export async function appendHandoffEvent(
  handoff: AssessmentAnalysisHandoff,
  eventType: string,
  payload: Record<string, unknown> = {},
  safeErrorCode: string | null = null,
) {
  const { error } = await events().insert({
    handoff_id: handoff.id,
    assessment_session_id: handoff.assessmentSessionId,
    organisation_id: handoff.organisationId,
    workspace_id: handoff.workspaceId,
    correlation_id: handoff.correlationId,
    event_type: eventType,
    safe_error_code: safeErrorCode,
    payload,
  });
  if (error) throw new Error(error.message);
}
