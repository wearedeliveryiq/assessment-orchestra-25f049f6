import { sprint03Configuration } from "./config";

type PatternPredicate =
  | { capability: string; operator: string; value: number }
  | { aggregate: string; capabilities: string[]; operator: string; value: number }
  | {
      difference: { leftMean: string[]; rightMean: string[] };
      operator: string;
      value: number;
    };
type PatternDefinition = Omit<(typeof sprint03Configuration.patterns)[number], "predicates"> & {
  predicates: PatternPredicate[];
};
export interface PatternInput {
  scores: Record<string, number>;
  confidence: Record<string, number>;
}

function average(ids: string[], scores: Record<string, number>): number | null {
  const values = ids.map((id) => scores[id]);
  return values.some((value) => value == null)
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compare(left: number, operator: string, right: number): boolean {
  if (operator === "lt") return left < right;
  if (operator === "lte") return left <= right;
  if (operator === "gte") return left >= right;
  if (operator === "gt") return left > right;
  if (operator === "eq") return left === right;
  throw new Error(`ANALYSIS_CONFIGURATION_INVALID: unsupported pattern operator ${operator}`);
}

function matches(definition: PatternDefinition, input: PatternInput): boolean {
  const referenced = new Set<string>();
  for (const predicate of definition.predicates) {
    if ("capability" in predicate) referenced.add(predicate.capability);
    if ("capabilities" in predicate) predicate.capabilities.forEach((id) => referenced.add(id));
    if ("difference" in predicate) {
      predicate.difference.leftMean.forEach((id) => referenced.add(id));
      predicate.difference.rightMean.forEach((id) => referenced.add(id));
    }
  }
  if (
    [...referenced].some(
      (id) =>
        input.scores[id] == null ||
        input.confidence[id] == null ||
        input.confidence[id] < definition.minimumCapabilityConfidence,
    )
  )
    return false;

  return definition.predicates.every((predicate) => {
    let left: number | null = null;
    if ("capability" in predicate) left = input.scores[predicate.capability] ?? null;
    else if ("capabilities" in predicate) left = average(predicate.capabilities, input.scores);
    else if ("difference" in predicate) {
      const leftMean = average(predicate.difference.leftMean, input.scores);
      const rightMean = average(predicate.difference.rightMean, input.scores);
      left = leftMean == null || rightMean == null ? null : leftMean - rightMean;
    }
    return left != null && compare(left, predicate.operator, predicate.value);
  });
}

export function detectPatterns(input: PatternInput) {
  const definitions = sprint03Configuration.patterns as PatternDefinition[];
  const matched = definitions.filter((definition) => matches(definition, input));
  const retained: PatternDefinition[] = [];
  const suppressed: Array<{ id: string; reason: "exclusive_group_lower_priority" }> = [];
  for (const definition of matched.sort((a, b) => b.priority - a.priority || a.order - b.order)) {
    if (retained.some((item) => item.exclusiveGroup === definition.exclusiveGroup)) {
      suppressed.push({ id: definition.id, reason: "exclusive_group_lower_priority" });
    } else retained.push(definition);
  }
  retained.sort((a, b) => a.order - b.order);
  return { detected: retained, suppressed };
}

export function resolvePatternConflict(
  matched: Array<{ id: string; group: string; priority: number; order: number }>,
) {
  const retained: string[] = [];
  const suppressed: Array<{ id: string; reason: "exclusive_group_lower_priority" }> = [];
  const groups = new Set<string>();
  for (const item of [...matched].sort((a, b) => b.priority - a.priority || a.order - b.order)) {
    if (groups.has(item.group))
      suppressed.push({ id: item.id, reason: "exclusive_group_lower_priority" });
    else {
      groups.add(item.group);
      retained.push(item.id);
    }
  }
  return { retained, suppressed };
}
