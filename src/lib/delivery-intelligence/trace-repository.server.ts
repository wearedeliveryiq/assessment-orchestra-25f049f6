/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TraceEdge, TraceNode } from "./traceability";

const sb = supabaseAdmin as unknown as { from: (table: string) => any };

export async function getTrace(
  analysisRunId: string,
  tenant: { organisationId: string; workspaceId: string },
): Promise<{ nodes: TraceNode[]; edges: TraceEdge[] }> {
  const nodeResponse = await sb
    .from("delivery_intelligence_trace_nodes")
    .select("*")
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .limit(500);
  if (nodeResponse.error) throw new Error(nodeResponse.error.message);
  const edgeResponse = await sb
    .from("delivery_intelligence_trace_edges")
    .select("*")
    .eq("analysis_run_id", analysisRunId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .limit(1000);
  if (edgeResponse.error) throw new Error(edgeResponse.error.message);
  return {
    nodes: nodeResponse.data.map((row: any) => ({
      id: row.id,
      tenantId: row.organisation_id,
      workspaceId: row.workspace_id,
      analysisRunId: row.analysis_run_id,
      nodeType: row.node_type,
      domainId: row.domain_id,
      domainVersion: row.domain_version,
      configurationSetId: row.configuration_set_id,
      contentHash: row.content_hash,
      visible: row.visible,
      payload: row.payload,
    })),
    edges: edgeResponse.data.map((row: any) => ({
      source: row.source_node_id,
      target: row.target_node_id,
      type: row.edge_type,
    })),
  };
}
