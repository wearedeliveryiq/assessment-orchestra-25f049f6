/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationEvaluationRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function candidate(row: Record<string, any>) {
  return {
    id: row.id,
    evaluationId: row.evaluation_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    result: row.result,
    matchedTriggers: row.matched_triggers,
    unmetTriggers: row.unmet_triggers,
    unmetPrerequisites: row.unmet_prerequisites,
    exclusions: row.exclusions,
    confidenceState: row.confidence_state,
    decisiveFacts: row.decisive_facts,
    sourceDomainIds: row.source_domain_ids,
    sourceTraceNodeIds: row.source_trace_node_ids,
    semanticHash: row.semantic_hash,
  };
}

function evaluation(row: Record<string, any>): RecommendationEvaluationRecord {
  return {
    id: row.id,
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
    evaluatorVersion: row.evaluator_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    candidates: (row.recommendation_candidate_evaluations ?? []).map(candidate),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_candidate_evaluations(*)";

export async function getEvaluation(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
  catalogueVersionId?: string,
): Promise<RecommendationEvaluationRecord | null> {
  let query = database
    .from("recommendation_evaluations")
    .select(selection)
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (catalogueVersionId) query = query.eq("catalogue_version_id", catalogueVersionId);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? evaluation(result.data) : null;
}

export async function publishEvaluation(
  input: Record<string, unknown>,
): Promise<RecommendationEvaluationRecord> {
  const result = await database.rpc("publish_recommendation_evaluation", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("RECOMMENDATION_EVALUATION_INVALID: publication returned no row");
  const persisted = await getEvaluation(
    row.analysis_run_id,
    { organisationId: row.organisation_id, workspaceId: row.workspace_id },
    row.catalogue_version_id,
  );
  if (!persisted)
    throw new Error("RECOMMENDATION_EVALUATION_INVALID: publication was not readable");
  return persisted;
}
