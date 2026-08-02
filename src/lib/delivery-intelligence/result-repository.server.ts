/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssessmentAnalysisRun } from "../analysis/types";
import { toAnalysisRun } from "../analysis/repository.server";
import type { CanonicalIntelligenceCore } from "./engine";
import type { TraceGraph } from "./traceability";

const sb = supabaseAdmin as unknown as {
  from: (table: string) => any;
  rpc: (name: string, parameters: Record<string, unknown>) => Promise<any>;
};

export interface StoredIntelligenceResult {
  id: string;
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
  resultHash: string;
  canonicalResult: CanonicalIntelligenceCore & { analysisRunId: string; generatedAt: string };
  publishedAt: string;
}

export async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function publishResult(
  run: AssessmentAnalysisRun,
  leaseOwner: string,
  result: StoredIntelligenceResult["canonicalResult"],
  trace: TraceGraph,
): Promise<AssessmentAnalysisRun> {
  const response = await sb.rpc("publish_delivery_intelligence_result", {
    p_run_id: run.id,
    p_lease_owner: leaseOwner,
    p_result_hash: await sha256(result),
    p_canonical_result: result,
    p_trace_nodes: trace.nodes,
    p_trace_edges: trace.edges,
  });
  if (response.error) throw new Error(response.error.message);
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) throw new Error("ANALYSIS_EXECUTION_TRANSIENT: result publication lost its lease");
  return toAnalysisRun(row);
}

export async function getResult(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<StoredIntelligenceResult | null> {
  const response = await sb
    .from("delivery_intelligence_results")
    .select("*")
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (response.error) throw new Error(response.error.message);
  if (!response.data) return null;
  return {
    id: response.data.id,
    analysisRunId: response.data.analysis_run_id,
    organisationId: response.data.organisation_id,
    workspaceId: response.data.workspace_id,
    resultHash: response.data.result_hash,
    canonicalResult: response.data.canonical_result,
    publishedAt: response.data.published_at,
  };
}
