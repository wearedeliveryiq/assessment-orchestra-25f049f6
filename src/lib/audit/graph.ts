import type {
  DecisionTrace,
  DecisionTraceStep,
  EvidenceEntityType,
  EvidenceGraph,
  EvidenceNeighbourhood,
  EvidenceNode,
  ExplainabilityRecord,
} from "./types";

/**
 * Pure, dependency-free graph traversal shared by the server services and the
 * browser Evidence Explorer. Keeping it isomorphic means the API and the UI can
 * never disagree about what "supporting evidence" means.
 */

export function nodeKey(type: EvidenceEntityType, id: string): string {
  return `${type}:${id}`;
}

export interface IndexedGraph {
  nodes: Map<string, EvidenceNode>;
  incoming: Map<string, ExplainabilityRecord[]>;
  outgoing: Map<string, ExplainabilityRecord[]>;
}

export function indexGraph(graph: EvidenceGraph): IndexedGraph {
  const nodes = new Map<string, EvidenceNode>();
  const incoming = new Map<string, ExplainabilityRecord[]>();
  const outgoing = new Map<string, ExplainabilityRecord[]>();

  for (const node of graph.nodes) nodes.set(nodeKey(node.type, node.id), node);

  for (const edge of graph.edges) {
    const from = nodeKey(edge.sourceType, edge.sourceId);
    const to = nodeKey(edge.targetType, edge.targetId);
    (outgoing.get(from) ?? outgoing.set(from, []).get(from)!).push(edge);
    (incoming.get(to) ?? incoming.set(to, []).get(to)!).push(edge);
  }

  return { nodes, incoming, outgoing };
}

export function getNode(
  graph: IndexedGraph,
  type: EvidenceEntityType,
  id: string,
): EvidenceNode | null {
  return graph.nodes.get(nodeKey(type, id)) ?? null;
}

/** One hop in both directions around an entity. */
export function neighbourhood(
  sessionId: string,
  graph: IndexedGraph,
  entity: EvidenceNode,
): EvidenceNeighbourhood {
  const key = nodeKey(entity.type, entity.id);
  const upstream = (graph.incoming.get(key) ?? [])
    .map((edge) => ({ node: graph.nodes.get(nodeKey(edge.sourceType, edge.sourceId)), edge }))
    .filter((item): item is { node: EvidenceNode; edge: ExplainabilityRecord } => Boolean(item.node));
  const downstream = (graph.outgoing.get(key) ?? [])
    .map((edge) => ({ node: graph.nodes.get(nodeKey(edge.targetType, edge.targetId)), edge }))
    .filter((item): item is { node: EvidenceNode; edge: ExplainabilityRecord } => Boolean(item.node));

  return { assessmentSessionId: sessionId, entity, upstream, downstream };
}

export interface TraverseOptions {
  direction: "upstream" | "downstream";
  maxDepth?: number;
  maxPaths?: number;
}

/**
 * Breadth-first traversal of the graph, returning both the flattened steps and
 * the concrete root-to-leaf paths (the "decision trace").
 */
export function traverse(
  sessionId: string,
  graph: IndexedGraph,
  root: EvidenceNode,
  options: TraverseOptions,
): Omit<DecisionTrace, "executionEvents" | "generatedAt"> {
  const maxDepth = options.maxDepth ?? 12;
  const maxPaths = options.maxPaths ?? 200;
  const steps: DecisionTraceStep[] = [{ depth: 0, node: root, via: null }];
  const seen = new Set([nodeKey(root.type, root.id)]);
  const paths: EvidenceNode[][] = [];

  const queue: { node: EvidenceNode; depth: number; path: EvidenceNode[] }[] = [
    { node: root, depth: 0, path: [root] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) {
      if (paths.length < maxPaths) paths.push(current.path);
      continue;
    }

    const key = nodeKey(current.node.type, current.node.id);
    const links =
      options.direction === "upstream"
        ? (graph.incoming.get(key) ?? [])
        : (graph.outgoing.get(key) ?? []);

    if (links.length === 0) {
      if (paths.length < maxPaths) paths.push(current.path);
      continue;
    }

    for (const edge of links) {
      const nextKey =
        options.direction === "upstream"
          ? nodeKey(edge.sourceType, edge.sourceId)
          : nodeKey(edge.targetType, edge.targetId);
      const next = graph.nodes.get(nextKey);
      if (!next) continue;

      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        steps.push({
          depth: current.depth + 1,
          node: next,
          via: {
            relationshipType: edge.relationshipType,
            confidence: edge.confidence,
            fromType: current.node.type,
            fromId: current.node.id,
          },
        });
      }

      if (current.path.some((item) => nodeKey(item.type, item.id) === nextKey)) continue;
      queue.push({ node: next, depth: current.depth + 1, path: [...current.path, next] });
    }
  }

  steps.sort((a, b) => a.depth - b.depth);
  return { assessmentSessionId: sessionId, direction: options.direction, root, steps, paths };
}

/** The originating assessment responses behind any entity. */
export function originatingResponses(
  sessionId: string,
  graph: IndexedGraph,
  root: EvidenceNode,
): EvidenceNode[] {
  const trace = traverse(sessionId, graph, root, { direction: "upstream" });
  const responses = trace.steps.filter((step) => step.node.type === "response");
  return responses.map((step) => step.node);
}
