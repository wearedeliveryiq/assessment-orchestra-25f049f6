import type { PipelineDefinition, PipelineStageDefinition, RetryPolicy } from "./types";

/**
 * Pipeline configuration.
 *
 * The orchestrator never hard-codes an execution order — it reads a pipeline
 * definition. A Knowledge Pack may publish stage overrides, which are merged
 * in by `resolvePipeline()` without any orchestration code change.
 */

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 400,
  factor: 2,
  maxBackoffMs: 8_000,
};

const stage = (
  id: string,
  engine: PipelineStageDefinition["engine"],
  label: string,
  description: string,
  dependsOn: string[],
  overrides: Partial<PipelineStageDefinition> = {},
): PipelineStageDefinition => ({
  id,
  engine,
  label,
  description,
  dependsOn,
  retry: DEFAULT_RETRY_POLICY,
  ...overrides,
});

export const DEFAULT_PIPELINE: PipelineDefinition = {
  id: "deliveryiq.intelligence-runtime",
  version: "1.0.0",
  label: "Intelligence Runtime",
  stages: [
    stage(
      "knowledge_pack",
      "knowledge_pack",
      "Knowledge Pack",
      "Resolve and validate the active Knowledge Pack for this assessment",
      [],
    ),
    stage(
      "observations",
      "observations",
      "Observation Engine",
      "Convert assessment responses into traceable observations",
      ["knowledge_pack"],
    ),
    stage("signals", "signals", "Signal Engine", "Infer organisational signals from observations", [
      "observations",
    ]),
    stage("rules", "rules", "Rule Engine", "Evaluate business rules against signals", ["signals"]),
    stage("patterns", "patterns", "Pattern Engine", "Detect higher-order patterns from rules", [
      "rules",
    ]),
    stage("scores", "scores", "Scoring Engine", "Convert patterns into weighted maturity scores", [
      "patterns",
    ]),
    stage(
      "recommendations",
      "recommendations",
      "Recommendation Engine",
      "Sequence interventions from patterns and scores",
      ["scores"],
    ),
    stage(
      "narrative",
      "narrative",
      "Narrative Engine",
      "Compose the evidence-based executive narrative",
      ["recommendations"],
    ),
    stage(
      "dashboard_refresh",
      "dashboard_refresh",
      "Dashboard Refresh",
      "Publish results, refresh the evidence graph and release reports",
      ["narrative"],
      { retry: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 } },
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Pipeline algebra — pure, dependency-graph aware
 * ------------------------------------------------------------------ */

/** Structural problems that make a pipeline unexecutable. */
export function validatePipeline(pipeline: PipelineDefinition): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  if (pipeline.stages.length === 0) issues.push("Pipeline defines no stages");

  for (const s of pipeline.stages) {
    if (ids.has(s.id)) issues.push(`Duplicate stage id "${s.id}"`);
    ids.add(s.id);
    if (s.retry.maxAttempts < 1) issues.push(`Stage "${s.id}" allows fewer than one attempt`);
  }

  for (const s of pipeline.stages) {
    for (const dep of s.dependsOn) {
      if (!ids.has(dep)) issues.push(`Stage "${s.id}" depends on unknown stage "${dep}"`);
    }
  }

  if (issues.length === 0 && executionLevels(pipeline) === null) {
    issues.push("Pipeline contains a dependency cycle");
  }

  return issues;
}

/**
 * Groups stages into dependency levels. Every stage in a level is independent
 * of its peers, so the executor can run a level sequentially today and in
 * parallel later without changing the pipeline definition.
 *
 * Returns `null` when the graph contains a cycle.
 */
export function executionLevels(pipeline: PipelineDefinition): PipelineStageDefinition[][] | null {
  const remaining = new Map(pipeline.stages.map((s) => [s.id, s]));
  const done = new Set<string>();
  const levels: PipelineStageDefinition[][] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((s) => s.dependsOn.every((d) => done.has(d)));
    if (ready.length === 0) return null;
    levels.push(ready);
    for (const s of ready) {
      remaining.delete(s.id);
      done.add(s.id);
    }
  }

  return levels;
}

/** Deterministic linear order used by the current sequential executor. */
export function topologicalOrder(pipeline: PipelineDefinition): PipelineStageDefinition[] {
  const levels = executionLevels(pipeline);
  if (!levels) throw new Error("Pipeline contains a dependency cycle");
  return levels.flat();
}

export function stageById(
  pipeline: PipelineDefinition,
  stageId: string,
): PipelineStageDefinition | undefined {
  return pipeline.stages.find((s) => s.id === stageId);
}

/**
 * Merges Knowledge Pack supplied stage overrides onto the default pipeline.
 * Packs may re-label stages, tune retry policies, mark stages optional or
 * append entirely new stages — none of which touches orchestration code.
 */
export function resolvePipeline(
  overrides?: Partial<PipelineStageDefinition>[] | null,
  base: PipelineDefinition = DEFAULT_PIPELINE,
): PipelineDefinition {
  if (!overrides || overrides.length === 0) return base;

  const stages = base.stages.map((s) => ({ ...s }));
  for (const override of overrides) {
    if (!override.id) continue;
    const index = stages.findIndex((s) => s.id === override.id);
    if (index >= 0) {
      stages[index] = { ...stages[index], ...override } as PipelineStageDefinition;
    } else if (override.engine) {
      stages.push({
        label: override.id,
        description: "",
        dependsOn: [],
        retry: DEFAULT_RETRY_POLICY,
        ...override,
      } as PipelineStageDefinition);
    }
  }

  return { ...base, stages };
}
