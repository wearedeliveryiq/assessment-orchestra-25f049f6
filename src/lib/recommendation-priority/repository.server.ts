/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationPriorityPreferenceRecord, RecommendationPriorityRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function priorityItem(row: Record<string, any>) {
  return {
    id: row.id,
    priorityModelId: row.priority_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    resolutionCandidateId: row.resolution_candidate_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    postConfidenceResult: row.post_confidence_result,
    generatedRank: row.generated_rank,
    priorityLabel: row.priority_label,
    impact: row.impact,
    effort: row.effort,
    rawRankScore: Number(row.raw_rank_score),
    components: row.components,
    componentWeights: row.component_weights,
    rationale: row.rationale,
    sourceRecommendationIds: row.source_recommendation_ids,
    sourceTraceNodeIds: row.source_trace_node_ids,
    semanticHash: row.semantic_hash,
  };
}

function preference(row: Record<string, any>): RecommendationPriorityPreferenceRecord {
  return {
    id: row.id,
    priorityModelId: row.priority_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    version: row.version,
    previousPreferenceId: row.previous_preference_id,
    orderedRecommendationIds: row.ordered_recommendation_ids,
    actorUserId: row.actor_user_id,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

async function latestPreference(
  priorityModelId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_priority_display_preferences")
    .select("*")
    .eq("priority_model_id", priorityModelId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? preference(result.data) : null;
}

async function model(row: Record<string, any>): Promise<RecommendationPriorityRecord> {
  const tenant = { organisationId: row.organisation_id, workspaceId: row.workspace_id };
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    intelligenceResultId: row.intelligence_result_id,
    recommendationEvaluationId: row.recommendation_evaluation_id,
    confidenceGateId: row.confidence_gate_id,
    conflictResolutionId: row.conflict_resolution_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    configurationSetId: row.configuration_set_id,
    catalogueVersionId: row.catalogue_version_id,
    catalogueId: row.catalogue_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    policyVersion: row.policy_version,
    modelVersion: row.model_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    canonicalPriority: row.canonical_priority,
    items: (row.recommendation_priority_items ?? []).map(priorityItem),
    preference: await latestPreference(row.id, tenant),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_priority_items(*)";

export async function getPriorityModel(
  conflictResolutionId: string,
  tenant: { organisationId: string; workspaceId: string },
  policyVersion?: string,
): Promise<RecommendationPriorityRecord | null> {
  let query = database
    .from("recommendation_priority_models")
    .select(selection)
    .eq("conflict_resolution_id", conflictResolutionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (policyVersion) query = query.eq("policy_version", policyVersion);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? model(result.data) : null;
}

export async function getPriorityModelForRun(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationPriorityRecord | null> {
  const result = await database
    .from("recommendation_priority_models")
    .select(selection)
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? model(result.data) : null;
}

export async function publishPriorityModel(
  input: Record<string, unknown>,
): Promise<RecommendationPriorityRecord> {
  const result = await database.rpc("publish_recommendation_priority_model", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_PRIORITY_INVALID: publication returned no row");
  const persisted = await getPriorityModel(
    row.conflict_resolution_id,
    { organisationId: row.organisation_id, workspaceId: row.workspace_id },
    row.policy_version,
  );
  if (!persisted) throw new Error("RECOMMENDATION_PRIORITY_INVALID: model was not readable");
  return persisted;
}

export async function setDisplayPreference(
  input: Record<string, unknown>,
): Promise<RecommendationPriorityPreferenceRecord> {
  const result = await database.rpc("set_recommendation_priority_display_preference", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_PRIORITY_INVALID: preference returned no row");
  return preference(row);
}
