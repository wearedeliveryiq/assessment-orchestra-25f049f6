import { sprint03Configuration } from "./config";

export interface RoadmapInput {
  ranked: string[];
  effort: Record<string, "low" | "medium" | "high">;
  dependencies: Record<string, string[]>;
}

export class RoadmapError extends Error {
  constructor(readonly cycle: string[]) {
    super("ROADMAP_DEPENDENCY_CYCLE");
    this.name = "RoadmapError";
  }
}

function topologicalOrder(input: RoadmapInput): { ordered: string[]; overrides: Set<string> } {
  const rankedIndex = new Map(input.ranked.map((id, index) => [id, index]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: string[] = [];
  const overrides = new Set<string>();

  const visit = (id: string, path: string[]) => {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      throw new RoadmapError([...path.slice(start), id]);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const dependencies = input.dependencies[id] ?? [];
    for (const dependency of dependencies) {
      if (rankedIndex.has(dependency)) {
        if ((rankedIndex.get(dependency) ?? 0) > (rankedIndex.get(id) ?? 0))
          overrides.add(dependency);
        visit(dependency, [...path, id]);
      }
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  };
  input.ranked.forEach((id) => visit(id, []));
  return { ordered, overrides };
}

export function buildRoadmap(input: RoadmapInput) {
  let graph: ReturnType<typeof topologicalOrder>;
  try {
    graph = topologicalOrder(input);
  } catch (error) {
    if (error instanceof RoadmapError) {
      return { published: false, error: { code: error.message, cycle: error.cycle } };
    }
    throw error;
  }

  const day30: Array<{ id: string; reason: string }> = [];
  const day60: Array<{ id: string; reason: string }> = [];
  const day90: Array<{ id: string; reason: string }> = [];
  const unscheduled: Array<{ id: string; reason: string }> = [];
  const placed = new Set<string>();
  const capacity = sprint03Configuration.roadmap.capacity;

  for (const id of graph.ordered) {
    const dependencies = input.dependencies[id] ?? [];
    const missingDependency = dependencies.some((dependency) => !input.ranked.includes(dependency));
    if (missingDependency) {
      unscheduled.push({ id, reason: "dependency_unavailable" });
      continue;
    }
    const effort = input.effort[id] ?? "high";
    let target = graph.overrides.has(id)
      ? day30
      : effort === "low" && dependencies.length === 0
        ? day30
        : effort === "high"
          ? day90
          : day60;
    if (
      dependencies.length > 0 &&
      dependencies.every((dependency) => day30.some((item) => item.id === dependency))
    ) {
      target = effort === "high" ? day60 : day60;
    }
    const limit =
      target === day30 ? capacity.day30 : target === day60 ? capacity.day60 : capacity.day90;
    if (target.length >= limit) {
      const alternatives = [day30, day60, day90].filter((candidate) => candidate !== target);
      const available = alternatives.find((candidate) => {
        const cap =
          candidate === day30
            ? capacity.day30
            : candidate === day60
              ? capacity.day60
              : capacity.day90;
        return candidate.length < cap && dependencies.every((dependency) => placed.has(dependency));
      });
      if (available) target = available;
      else {
        unscheduled.push({ id, reason: "capacity_exceeded" });
        continue;
      }
    }
    target.push({
      id,
      reason: graph.overrides.has(id)
        ? "dependency_precedence"
        : dependencies.length > 0
          ? "dependency_satisfied"
          : "rank_and_horizon_fit",
    });
    placed.add(id);
  }
  return { published: true, day30, day60, day90, unscheduled };
}
