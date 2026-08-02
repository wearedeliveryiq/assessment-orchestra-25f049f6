import { sprint03Configuration } from "./config";

export interface TraceFixtureInput {
  nodes: string[];
  edges: [string, string, string][];
  visibleOutputs: string[];
}

export function validateFixtureTrace(input: TraceFixtureInput) {
  const nodeSet = new Set(input.nodes);
  const errors: string[] = [];
  const reverse = new Map<string, string[]>();
  for (const [source, relationship, target] of input.edges) {
    if (!nodeSet.has(source) || !nodeSet.has(target)) errors.push(`orphan:${source}:${target}`);
    if (!sprint03Configuration.traceability.edgeTypes.includes(relationship)) {
      errors.push(`invalid_edge_type:${relationship}`);
    }
    const parents = reverse.get(target) ?? [];
    parents.push(source);
    reverse.set(target, parents);
  }

  const reverseEvidencePaths: Record<string, string[]> = {};
  const pathToEvidence = (start: string): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      if (current.startsWith("e")) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const parent of reverse.get(current) ?? []) queue.push([...path, parent]);
    }
    return null;
  };
  for (const output of input.visibleOutputs) {
    const path = pathToEvidence(output);
    if (!path) errors.push(`missing_evidence_path:${output}`);
    else reverseEvidencePaths[output] = path;
  }
  return { valid: errors.length === 0, reverseEvidencePaths, errors };
}
