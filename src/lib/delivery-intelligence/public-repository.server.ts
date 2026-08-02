/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const sb = supabaseAdmin as unknown as {
  from: (table: string) => any;
  rpc: (name: string, parameters: Record<string, unknown>) => Promise<any>;
};

export async function issuePublicResult(input: {
  id: string;
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
  userId: string;
  tokenHash: string;
  publicProjection: Record<string, unknown>;
  expiresAt: string;
}) {
  const response = await sb
    .from("delivery_dna_public_results")
    .insert({
      id: input.id,
      analysis_run_id: input.analysisRunId,
      organisation_id: input.organisationId,
      workspace_id: input.workspaceId,
      consented_by_user_id: input.userId,
      token_hash: input.tokenHash,
      audience: "delivery-dna-public-result",
      disclosure_version: "sprint03-product-config-1.0.0",
      public_projection: input.publicProjection,
      expires_at: input.expiresAt,
    })
    .select("id, expires_at")
    .single();
  if (response.error) throw new Error(response.error.message);
  return { id: response.data.id as string, expiresAt: response.data.expires_at as string };
}

export async function resolvePublicResult(tokenHash: string, ipHash: string) {
  const response = await sb.rpc("resolve_delivery_dna_public_result", {
    p_token_hash: tokenHash,
    p_ip_hash: ipHash,
  });
  if (response.error) {
    if (response.error.message.includes("PUBLIC_RATE_LIMITED")) {
      throw new Error("PUBLIC_RATE_LIMITED");
    }
    throw new Error(response.error.message);
  }
  return response.data as Record<string, unknown> | null;
}

export async function revokePublicResult(input: {
  id: string;
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
}) {
  const response = await sb
    .from("delivery_dna_public_results")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("analysis_run_id", input.analysisRunId)
    .eq("organisation_id", input.organisationId)
    .eq("workspace_id", input.workspaceId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (response.error) throw new Error(response.error.message);
  return response.data != null;
}
