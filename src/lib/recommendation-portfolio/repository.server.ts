/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { RecommendationPortfolioRecord } from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function portfolioItem(row: Record<string, any>) {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    priorityItemId: row.priority_item_id,
    sequenceItemId: row.sequence_item_id,
    resolutionCandidateId: row.resolution_candidate_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueOrder: row.catalogue_order,
    portfolioOrder: row.portfolio_order,
    title: row.title,
    outcome: row.outcome,
    successMeasures: row.success_measures,
    matchedTriggers: row.matched_triggers,
    generatedRank: row.generated_rank,
    priorityLabel: row.priority_label,
    impact: row.impact,
    effort: row.effort,
    urgency: Number(row.urgency),
    confidenceState: row.confidence_state,
    confidenceResult: row.confidence_result,
    confidenceCaveat: row.confidence_caveat,
    generatedSequence: row.generated_sequence,
    generatedHorizon: row.generated_horizon,
    sequenceState: row.sequence_state,
    sequenceReasonCode: row.sequence_reason_code,
    blockingDependencyIds: row.blocking_dependency_ids,
    dependencies: row.dependencies,
    caveats: row.caveats,
    rationale: row.rationale,
    sourceTraceNodeIds: row.source_trace_node_ids,
    primaryClass: row.primary_class,
    secondaryTags: row.secondary_tags,
    semanticHash: row.semantic_hash,
  };
}

function portfolio(row: Record<string, any>): RecommendationPortfolioRecord {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    recommendationEvaluationId: row.recommendation_evaluation_id,
    confidenceGateId: row.confidence_gate_id,
    conflictResolutionId: row.conflict_resolution_id,
    priorityModelId: row.priority_model_id,
    sequenceModelId: row.sequence_model_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    configurationSetId: row.configuration_set_id,
    catalogueVersionId: row.catalogue_version_id,
    catalogueId: row.catalogue_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    policyVersion: row.policy_version,
    projectorVersion: row.projector_version,
    state: row.portfolio_state,
    itemCount: row.item_count,
    scheduledCount: row.scheduled_count,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    canonicalInput: row.canonical_input,
    canonicalPortfolio: row.canonical_portfolio,
    items: (row.recommendation_portfolio_items ?? []).map(portfolioItem),
    createdAt: row.created_at,
  };
}

const selection = "*,recommendation_portfolio_items(*)";

export async function getPortfolio(
  sequenceModelId: string,
  tenant: { organisationId: string; workspaceId: string },
  policyVersion?: string,
): Promise<RecommendationPortfolioRecord | null> {
  let query = database
    .from("recommendation_portfolios")
    .select(selection)
    .eq("sequence_model_id", sequenceModelId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId);
  if (policyVersion) query = query.eq("policy_version", policyVersion);
  const result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? portfolio(result.data) : null;
}

export async function getPortfolioForRun(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationPortfolioRecord | null> {
  const result = await database
    .from("recommendation_portfolios")
    .select(selection)
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? portfolio(result.data) : null;
}

export async function getPortfolioById(
  portfolioId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<RecommendationPortfolioRecord | null> {
  const result = await database
    .from("recommendation_portfolios")
    .select(selection)
    .eq("id", portfolioId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? portfolio(result.data) : null;
}

export async function publishPortfolio(
  input: Record<string, unknown>,
): Promise<RecommendationPortfolioRecord> {
  const result = await database.rpc("publish_recommendation_portfolio", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("PORTFOLIO_PUBLICATION_FAILED: publication returned no row");
  const persisted = await getPortfolio(
    row.sequence_model_id,
    { organisationId: row.organisation_id, workspaceId: row.workspace_id },
    row.policy_version,
  );
  if (!persisted) throw new Error("PORTFOLIO_PUBLICATION_FAILED: portfolio was not readable");
  return persisted;
}
