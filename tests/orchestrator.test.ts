import { describe, expect, it } from "vitest";

import {
  DEFAULT_PIPELINE,
  DEFAULT_RETRY_POLICY,
  executionLevels,
  resolvePipeline,
  stageById,
  topologicalOrder,
  validatePipeline,
} from "@/lib/orchestrator/pipeline";
import { assertTransition, canTransition, isTerminal } from "@/lib/orchestrator/state-machine";
import { backoffDelay, classifyFailure, shouldRetry } from "@/lib/orchestrator/retry";
import { computeProgress } from "@/lib/orchestrator/progress";
import type { ExecutionStage } from "@/lib/orchestrator/types";

function stage(overrides: Partial<ExecutionStage>): ExecutionStage {
  return {
    id: overrides.stageId ?? "s",
    executionId: "e",
    stageId: overrides.stageId ?? "s",
    engine: "observations",
    sequence: 1,
    dependsOn: [],
    status: "pending",
    attempt: 0,
    maxAttempts: 3,
    startedAt: null,
    completedAt: null,
    durationMs: 0,
    errorMessage: null,
    failureClass: null,
    retryHistory: [],
    ...overrides,
  };
}

describe("pipeline definition", () => {
  it("is structurally valid", () => {
    expect(validatePipeline(DEFAULT_PIPELINE)).toEqual([]);
  });

  it("orders stages so dependencies always run first", () => {
    const order = topologicalOrder(DEFAULT_PIPELINE).map((s) => s.id);
    for (const definition of DEFAULT_PIPELINE.stages) {
      for (const dependency of definition.dependsOn) {
        expect(order.indexOf(dependency)).toBeLessThan(order.indexOf(definition.id));
      }
    }
  });

  it("detects dependency cycles", () => {
    const cyclic = {
      ...DEFAULT_PIPELINE,
      stages: [
        { ...DEFAULT_PIPELINE.stages[0], dependsOn: ["observations"] },
        { ...DEFAULT_PIPELINE.stages[1], dependsOn: ["knowledge_pack"] },
      ],
    };
    expect(executionLevels(cyclic)).toBeNull();
    expect(validatePipeline(cyclic).join()).toMatch(/cycle/i);
  });

  it("reports unknown dependencies", () => {
    const broken = {
      ...DEFAULT_PIPELINE,
      stages: [{ ...DEFAULT_PIPELINE.stages[0], dependsOn: ["nope"] }],
    };
    expect(validatePipeline(broken).join()).toMatch(/nope/);
  });

  it("applies Knowledge Pack overrides without touching orchestration code", () => {
    const resolved = resolvePipeline([
      { id: "narrative", optional: true, label: "AI Narrative" },
      {
        id: "benefits",
        engine: "recommendations",
        label: "Benefits",
        dependsOn: ["scores"],
        retry: DEFAULT_RETRY_POLICY,
      },
    ]);
    expect(stageById(resolved, "narrative")?.optional).toBe(true);
    expect(stageById(resolved, "narrative")?.label).toBe("AI Narrative");
    expect(stageById(resolved, "benefits")).toBeDefined();
    expect(validatePipeline(resolved)).toEqual([]);
    // Base definition must remain untouched.
    expect(stageById(DEFAULT_PIPELINE, "narrative")?.optional).not.toBe(true);
  });
});

describe("execution state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("queued", "starting")).toBe(true);
    expect(canTransition("starting", "running")).toBe(true);
    expect(canTransition("running", "completed")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransition("completed", "running")).toBe(false);
    expect(() => assertTransition("completed", "running")).toThrow(/Illegal execution transition/);
  });

  it("permits requeueing a failed or cancelled execution", () => {
    expect(canTransition("failed", "queued")).toBe(true);
    expect(canTransition("cancelled", "queued")).toBe(true);
  });

  it("knows terminal states", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("running")).toBe(false);
  });
});

describe("retry manager", () => {
  it("classifies transient infrastructure failures", () => {
    expect(classifyFailure(new Error("fetch failed: ETIMEDOUT"))).toBe("transient");
    expect(classifyFailure(new Error("429 too many requests"))).toBe("transient");
  });

  it("classifies deterministic failures as permanent", () => {
    expect(classifyFailure(new Error("Invalid knowledge pack schema"))).toBe("permanent");
    expect(classifyFailure(new Error("No engine registered for stage"))).toBe("permanent");
  });

  it("honours an explicit failureClass tag", () => {
    const tagged = Object.assign(new Error("boom"), { failureClass: "transient" as const });
    expect(classifyFailure(tagged)).toBe("transient");
  });

  it("applies capped exponential backoff", () => {
    const policy = { maxAttempts: 5, backoffMs: 500, factor: 2, maxBackoffMs: 2000 };
    expect(backoffDelay(1, policy)).toBe(0);
    expect(backoffDelay(2, policy)).toBe(500);
    expect(backoffDelay(3, policy)).toBe(1000);
    expect(backoffDelay(4, policy)).toBe(2000);
    expect(backoffDelay(9, policy)).toBe(2000);
  });

  it("only retries transient failures within the attempt budget", () => {
    const policy = { maxAttempts: 3, backoffMs: 100, factor: 2, maxBackoffMs: 1000 };
    expect(shouldRetry("transient", 1, policy)).toBe(true);
    expect(shouldRetry("transient", 3, policy)).toBe(false);
    expect(shouldRetry("permanent", 1, policy)).toBe(false);
  });
});

describe("progress reporting", () => {
  it("derives percentage from persisted stage state", () => {
    const stages = [
      stage({ stageId: "a", status: "completed", durationMs: 100 }),
      stage({ stageId: "b", status: "running" }),
      stage({ stageId: "c", status: "pending" }),
      stage({ stageId: "d", status: "pending" }),
    ];
    const progress = computeProgress(stages, Date.now());
    expect(progress.percentage).toBe(25);
    expect(progress.completed).toBe(1);
    expect(progress.currentStage).toBe("b");
    expect(progress.estimatedRemainingMs).not.toBeNull();
  });

  it("counts skipped optional stages as finished", () => {
    const stages = [
      stage({ stageId: "a", status: "completed", durationMs: 10 }),
      stage({ stageId: "b", status: "skipped", durationMs: 5 }),
    ];
    expect(computeProgress(stages).percentage).toBe(100);
  });

  it("has no estimate before the first stage completes", () => {
    expect(computeProgress([stage({ status: "running" })]).estimatedRemainingMs).toBeNull();
  });
});
