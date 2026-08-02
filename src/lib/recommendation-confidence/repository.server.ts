/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationConfidenceGateRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function candidate(row: Record<string, any>) {
  return {
    id: row.id,
    confidenceGateId: row.confidence_gate_id,
    candidateEvaluationId: row.candidate_evaluation_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    effort: row.effort,
    preGateResult: row.pre_gate_result,
    postGateResult: row.post_gate_result,
    reasonCode: row.reason_code,
    confidenceState: row.confidence_state,
    caveat: row.caveat,
    limitationCodes: row.limitation_codes,
    sourceTraceNodeIds: row.source_trace_node_ids,
    semanticHash: row.semantic_hash,
  };
}

function gate(row: Record<string, any>): RecommendationConfidenceGateRecord {
  return {
    id: row.id,
    recommendationEvaluationId: row.recommendation_evaluation_id,
    analysisRunId: row.analysis_run_id,
    intelligenceResultId: row.intelligence_result_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    configurationSetId: row.configuration_set_id,
    catalogueVersionId: row.catalogue_version_id,
    catalogueId: row.catalogue_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    policyVersion: row.policy_version,
    confidenceVersion: row.confidence_version,
    gateEngineVersion: row.gate_engine_version,
    confidenceIndex: Number(row.confidence_index),
    confidenceState: row.confidence_state,
    limitationCodes: row.limitation_codes,
    caveat: row.caveat,
    confidenceTraceNodeId: row.confidence_trace_node_id,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    canonicalGate: row.canonical_gate,
    candidates: (row.recommendation_candidate_confidence_gates ?? []).map(candidate),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_candidate_confidence_gates(*)";

export async function getConfidenceGate(
  recommendationEvaluationId: string,
  tenant: { organisationId: string; workspaceId: string },
  policyVersion?: string,
): Promise<RecommendationConfidenceGateRecord | null> {
  let query = database
    .from("recommendation_confidence_gates")
    .select(selection)
    .eq("recommendation_evaluation_id", recommendationEvaluationId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (policyVersion) query = query.eq("policy_version", policyVersion);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? gate(result.data) : null;
}

export async function getConfidenceGateForRun(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationConfidenceGateRecord | null> {
  const result = await database
    .from("recommendation_confidence_gates")
    .select(selection)
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? gate(result.data) : null;
}

export async function publishConfidenceGate(
  input: Record<string, unknown>,
): Promise<RecommendationConfidenceGateRecord> {
  const result = await database.rpc("publish_recommendation_confidence_gate", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_EVALUATION_INVALID: gate publication returned no row");
  const persisted = await getConfidenceGate(
    row.recommendation_evaluation_id,
    {
      organisationId: row.organisation_id,
      workspaceId: row.workspace_id,
    },
    row.policy_version,
  );
  if (!persisted) {
    throw new Error("RECOMMENDATION_EVALUATION_INVALID: confidence gate was not readable");
  }
  return persisted;
}
