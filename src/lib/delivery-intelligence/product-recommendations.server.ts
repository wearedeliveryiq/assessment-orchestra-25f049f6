/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types do not include pending migrations. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapKnowledgePacks, mapTeamMates } from "./mappings";

const db = () => supabaseAdmin as unknown as any;

export async function resolveProductRecommendations(input: {
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
  recommendationIds: string[];
  permissions: string[];
}) {
  const [
    { data: availability, error: availabilityError },
    { data: entitlements, error: entitlementError },
    { data: acceptances, error: acceptanceError },
  ] = await Promise.all([
    db().from("delivery_product_availability").select("product_type,product_id,status"),
    db()
      .from("organisation_product_entitlements")
      .select("product_type,product_id,entitled")
      .eq("organisation_id", input.organisationId),
    db()
      .from("analysis_recommendation_acceptances")
      .select("recommendation_id")
      .eq("analysis_run_id", input.analysisRunId)
      .eq("organisation_id", input.organisationId)
      .eq("workspace_id", input.workspaceId),
  ]);
  if (availabilityError || entitlementError || acceptanceError)
    throw availabilityError ?? entitlementError ?? acceptanceError;

  const entitled = new Map(
    (entitlements ?? []).map((row: any) => [`${row.product_type}:${row.product_id}`, row.entitled]),
  );
  const packs: Record<string, { status: string; entitled: boolean }> = {};
  const teamMates: Record<string, { available: boolean; entitled: boolean }> = {};
  for (const row of availability ?? []) {
    const isEntitled = entitled.get(`${row.product_type}:${row.product_id}`) === true;
    if (row.product_type === "knowledge_pack")
      packs[row.product_id] = { status: row.status, entitled: isEntitled };
    if (row.product_type === "teammate")
      teamMates[row.product_id] = { available: row.status === "active", entitled: isEntitled };
  }
  const ranks = Object.fromEntries(input.recommendationIds.map((id, index) => [id, index + 1]));
  return {
    knowledgePacks: mapKnowledgePacks(ranks, packs),
    teamMates: mapTeamMates({
      acceptedRecommendations: (acceptances ?? []).map((row: any) => row.recommendation_id),
      authenticated: true,
      permission: input.permissions.includes("teammate.activate") ? "teammate.activate" : "",
      catalogue: teamMates,
    }),
  };
}

export async function acceptRecommendation(input: {
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
  recommendationId: string;
  userId: string;
}) {
  const { error } = await db().from("analysis_recommendation_acceptances").upsert(
    {
      analysis_run_id: input.analysisRunId,
      organisation_id: input.organisationId,
      workspace_id: input.workspaceId,
      recommendation_id: input.recommendationId,
      accepted_by_user_id: input.userId,
    },
    { onConflict: "analysis_run_id,recommendation_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}
