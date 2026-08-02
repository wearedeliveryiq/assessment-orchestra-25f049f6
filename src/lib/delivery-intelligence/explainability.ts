import type { TraceGraph, TraceNode } from "./traceability";

function safeNode(node: TraceNode, canAuditEvidence: boolean) {
  const restricted = node.nodeType === "evidence" && !canAuditEvidence;
  return {
    id: node.id,
    type: node.nodeType,
    domainId: restricted ? "restricted-evidence" : node.domainId,
    domainVersion: node.domainVersion,
    payload: restricted ? { state: "restricted" } : node.payload,
  };
}

export function explainConclusion(
  graph: TraceGraph,
  conclusionId: string,
  options: { canAuditEvidence: boolean; maximumDepth?: number } = { canAuditEvidence: false },
) {
  const maximumDepth = Math.min(options.maximumDepth ?? 8, 8);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const conclusion = nodes.get(conclusionId);
  if (!conclusion?.visible) return null;
  const reverse = new Map<string, string[]>();
  for (const edge of graph.edges)
    reverse.set(edge.target, [...(reverse.get(edge.target) ?? []), edge.source]);
  const queue: Array<{ id: string; depth: number }> = [{ id: conclusionId, depth: 0 }];
  const included = new Set<string>();
  while (queue.length) {
    const item = queue.shift()!;
    if (included.has(item.id) || item.depth > maximumDepth) continue;
    included.add(item.id);
    for (const parent of reverse.get(item.id) ?? [])
      queue.push({ id: parent, depth: item.depth + 1 });
  }
  return {
    conclusion: safeNode(conclusion, options.canAuditEvidence),
    nodes: [...included].map((id) => safeNode(nodes.get(id)!, options.canAuditEvidence)),
    edges: graph.edges.filter((edge) => included.has(edge.source) && included.has(edge.target)),
    evidenceRestricted: !options.canAuditEvidence,
  };
}
