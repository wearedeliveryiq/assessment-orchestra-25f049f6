/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationSequenceOverrideRecord, RecommendationSequenceRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

export interface RecommendationDependencyMappingRecord {
  recommendationId: string;
  dependencyId: string;
  dependencyType: "required" | "recommended";
}

function sequenceItem(row: Record<string, any>) {
  return {
    id: row.id,
    sequenceModelId: row.sequence_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    priorityItemId: row.priority_item_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    generatedRank: row.generated_rank,
    generatedSequence: row.generated_sequence,
    generatedHorizon: row.generated_horizon,
    effort: row.effort,
    sequenceState: row.sequence_state,
    reasonCode: row.reason_code,
    blockingDependencyIds: row.blocking_dependency_ids,
    caveats: row.caveats,
    sourceTraceNodeIds: row.source_trace_node_ids,
    semanticHash: row.semantic_hash,
  };
}

function dependency(row: Record<string, any>) {
  return {
    id: row.id,
    sequenceModelId: row.sequence_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    dependantRecommendationId: row.dependant_recommendation_id,
    sourceDependencyId: row.source_dependency_id,
    resolvedDependencyId: row.resolved_dependency_id,
    dependencyType: row.dependency_type,
    resolution: row.resolution,
    state: row.dependency_state,
    reasonCode: row.reason_code,
    semanticHash: row.semantic_hash,
  };
}

function override(row: Record<string, any>): RecommendationSequenceOverrideRecord {
  return {
    id: row.id,
    sequenceModelId: row.sequence_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    version: row.version,
    previousOverrideId: row.previous_override_id,
    orderedRecommendationIds: row.ordered_recommendation_ids,
    reason: row.reason,
    acknowledgedRisk: true,
    dependencyRisks: row.dependency_risks,
    actorUserId: row.actor_user_id,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

async function latestOverride(
  sequenceModelId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_sequence_overrides")
    .select("*")
    .eq("sequence_model_id", sequenceModelId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? override(result.data) : null;
}

async function model(row: Record<string, any>): Promise<RecommendationSequenceRecord> {
  const tenant = { organisationId: row.organisation_id, workspaceId: row.workspace_id };
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    priorityModelId: row.priority_model_id,
    conflictResolutionId: row.conflict_resolution_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    configurationSetId: row.configuration_set_id,
    catalogueVersionId: row.catalogue_version_id,
    catalogueId: row.catalogue_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    policyVersion: row.policy_version,
    engineVersion: row.engine_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    canonicalSequence: row.canonical_sequence,
    items: (row.recommendation_sequence_items ?? []).map(sequenceItem),
    dependencies: (row.recommendation_sequence_dependencies ?? []).map(dependency),
    override: await latestOverride(row.id, tenant),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_sequence_items(*),recommendation_sequence_dependencies(*)";

export async function getSequenceModel(
  priorityModelId: string,
  tenant: { organisationId: string; workspaceId: string },
  policyVersion?: string,
): Promise<RecommendationSequenceRecord | null> {
  let query = database
    .from("recommendation_sequence_models")
    .select(selection)
    .eq("priority_model_id", priorityModelId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (policyVersion) query = query.eq("policy_version", policyVersion);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? model(result.data) : null;
}

export async function getSequenceModelForRun(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationSequenceRecord | null> {
  const result = await database
    .from("recommendation_sequence_models")
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

export async function getDependencyMappings(
  catalogueVersionId: string,
): Promise<RecommendationDependencyMappingRecord[]> {
  const result = await database
    .from("recommendation_dependency_mappings")
    .select("recommendation_id,dependency_id,dependency_type")
    .eq("catalogue_version_id", catalogueVersionId)
    .order("recommendation_id", { ascending: true })
    .order("dependency_id", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row: Record<string, any>) => ({
    recommendationId: row.recommendation_id,
    dependencyId: row.dependency_id,
    dependencyType: row.dependency_type,
  }));
}

export async function publishSequenceModel(
  input: Record<string, unknown>,
): Promise<RecommendationSequenceRecord> {
  const result = await database.rpc("publish_recommendation_sequence_model", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_SEQUENCE_INVALID: publication returned no row");
  const persisted = await getSequenceModel(
    row.priority_model_id,
    { organisationId: row.organisation_id, workspaceId: row.workspace_id },
    row.policy_version,
  );
  if (!persisted) throw new Error("RECOMMENDATION_SEQUENCE_INVALID: model was not readable");
  return persisted;
}

export async function setSequenceOverride(
  input: Record<string, unknown>,
): Promise<RecommendationSequenceOverrideRecord> {
  const result = await database.rpc("set_recommendation_sequence_override", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_SEQUENCE_INVALID: override returned no row");
  return override(row);
}
