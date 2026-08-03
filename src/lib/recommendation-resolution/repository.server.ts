/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationResolutionRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function candidate(row: Record<string, any>) {
  return {
    id: row.id,
    resolutionId: row.resolution_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    candidateConfidenceGateId: row.candidate_confidence_gate_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    postConfidenceResult: row.post_confidence_result,
    resolutionResult: row.resolution_result,
    reasonCode: row.reason_code,
    winnerRecommendationId: row.winner_recommendation_id,
    winnerRecommendationVersion: row.winner_recommendation_version,
    sourceCandidateGateIds: row.source_candidate_gate_ids,
    sourceTraceNodeIds: row.source_trace_node_ids,
    semanticHash: row.semantic_hash,
  };
}

function resolution(row: Record<string, any>): RecommendationResolutionRecord {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    recommendationEvaluationId: row.recommendation_evaluation_id,
    confidenceGateId: row.confidence_gate_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    configurationSetId: row.configuration_set_id,
    catalogueVersionId: row.catalogue_version_id,
    catalogueId: row.catalogue_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    policyVersion: row.policy_version,
    resolverVersion: row.resolver_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    canonicalResolution: row.canonical_resolution,
    candidates: (row.recommendation_resolution_candidates ?? []).map(candidate),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_resolution_candidates(*)";

export async function getResolution(
  confidenceGateId: string,
  tenant: { organisationId: string; workspaceId: string },
  policyVersion?: string,
): Promise<RecommendationResolutionRecord | null> {
  let query = database
    .from("recommendation_conflict_resolutions")
    .select(selection)
    .eq("confidence_gate_id", confidenceGateId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (policyVersion) query = query.eq("policy_version", policyVersion);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? resolution(result.data) : null;
}

export async function getResolutionForRun(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationResolutionRecord | null> {
  const result = await database
    .from("recommendation_conflict_resolutions")
    .select(selection)
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? resolution(result.data) : null;
}

export async function publishResolution(
  input: Record<string, unknown>,
): Promise<RecommendationResolutionRecord> {
  const result = await database.rpc("publish_recommendation_conflict_resolution", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_RESOLUTION_INVALID: publication returned no row");
  const persisted = await getResolution(
    row.confidence_gate_id,
    { organisationId: row.organisation_id, workspaceId: row.workspace_id },
    row.policy_version,
  );
  if (!persisted) {
    throw new Error("RECOMMENDATION_RESOLUTION_INVALID: resolution was not readable");
  }
  return persisted;
}
