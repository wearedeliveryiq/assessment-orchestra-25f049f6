import { sprint03Configuration } from "./config";

export type TraceNodeType =
  | (typeof sprint03Configuration.traceability.nodeTypes)[number]
  | "response"
  | "domain_score"
  | "industry_context_item";
export type TraceEdgeType = (typeof sprint03Configuration.traceability.edgeTypes)[number];

export interface TraceNode {
  id: string;
  tenantId: string;
  workspaceId: string;
  analysisRunId: string;
  nodeType: TraceNodeType;
  domainId: string;
  domainVersion: string;
  configurationSetId: string;
  contentHash: string;
  visible: boolean;
  payload: unknown;
}

export interface TraceEdge {
  source: string;
  target: string;
  type: TraceEdgeType;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
}

export function validateTraceGraph(graph: TraceGraph) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const errors: string[] = [];
  if (nodeMap.size !== graph.nodes.length) errors.push("duplicate_node_id");
  const reverse = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) {
      errors.push(`orphan:${edge.source}:${edge.target}`);
      continue;
    }
    if (!sprint03Configuration.traceability.edgeTypes.includes(edge.type)) {
      errors.push(`invalid_edge_type:${edge.type}`);
    }
    if (
      source.tenantId !== target.tenantId ||
      source.workspaceId !== target.workspaceId ||
      source.analysisRunId !== target.analysisRunId
    ) {
      errors.push(`cross_scope_edge:${edge.source}:${edge.target}`);
    }
    reverse.set(edge.target, [...(reverse.get(edge.target) ?? []), edge.source]);
  }

  const evidencePaths: Record<string, string[]> = {};
  for (const output of graph.nodes.filter((node) => node.visible)) {
    const queue: string[][] = [[output.id]];
    const visited = new Set<string>();
    let evidencePath: string[] | undefined;
    while (queue.length && !evidencePath) {
      const path = queue.shift()!;
      const current = nodeMap.get(path[path.length - 1]);
      if (current?.nodeType === "evidence") evidencePath = path;
      else if (current?.nodeType === "response") evidencePath = path;
      else if (current && !visited.has(current.id)) {
        visited.add(current.id);
        for (const parent of reverse.get(current.id) ?? []) queue.push([...path, parent]);
      }
    }
    if (!evidencePath) errors.push(`missing_evidence_path:${output.id}`);
    else evidencePaths[output.id] = evidencePath;
  }
  return { valid: errors.length === 0, evidencePaths, errors };
}

export interface TraceFixtureInput {
  nodes: string[];
  edges: [string, string, string][];
  visibleOutputs: string[];
}

/** Adapter retaining the exact DIQ-203B compact fixture representation. */
export function validateFixtureTrace(input: TraceFixtureInput) {
  const graph: TraceGraph = {
    nodes: input.nodes.map((id) => ({
      id,
      tenantId: "fixture-tenant",
      workspaceId: "fixture-workspace",
      analysisRunId: "fixture-run",
      nodeType: id.startsWith("e") ? "evidence" : "presentation_item",
      domainId: id,
      domainVersion: "1.0.0",
      configurationSetId: "sprint03-product-config-1.0.0",
      contentHash: "0".repeat(64),
      visible: input.visibleOutputs.includes(id),
      payload: { id },
    })),
    edges: input.edges.map(([source, type, target]) => ({
      source,
      target,
      type: type as TraceEdgeType,
    })),
  };
  const validated = validateTraceGraph(graph);
  return {
    valid: validated.valid,
    reverseEvidencePaths: validated.evidencePaths,
    errors: validated.errors,
  };
}
