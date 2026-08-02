import { describe, expect, it, vi } from "vitest";

import {
  AnalysisRunExecutor,
  classifyExecutionFailure,
  type AnalysisExecutorDependencies,
} from "@/lib/analysis/executor.server";
import type { AssessmentAnalysisRun } from "@/lib/analysis/types";

const run = {
  id: "run-1",
  status: "running",
  attempt: 1,
  configurationSetId: "sprint03-product-config-1.0.0",
  inputHash: "a".repeat(64),
} as AssessmentAnalysisRun;

function harness(publish: () => Promise<AssessmentAnalysisRun>) {
  const events: string[] = [];
  const dependencies: AnalysisExecutorDependencies = {
    claim: vi.fn(async () => run),
    fail: vi.fn(async (_id, _owner, failure) => ({
      ...run,
      status: "failed",
      errorCode: failure.code,
      retryable: failure.retryable,
    })),
    event: vi.fn(async (_run, type) => {
      events.push(type);
    }),
    publish,
    workerId: () => "worker-1",
  };
  return { executor: new AnalysisRunExecutor(dependencies), dependencies, events };
}

describe("S3-001 analysis worker", () => {
  it("atomically claims and completes one run with structured events", async () => {
    const { executor, dependencies, events } = harness(
      vi.fn(async () => ({ ...run, status: "completed" })),
    );
    await expect(executor.execute(run.id)).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.claim).toHaveBeenCalledWith(run.id, "worker-1", 120);
    expect(dependencies.publish).toHaveBeenCalledWith(run, "worker-1");
    expect(events).toEqual(["analysis.started", "analysis.completed"]);
  });

  it("records safe non-retryable validation failures", async () => {
    const { executor, dependencies, events } = harness(async () => {
      throw new Error("ANALYSIS_INPUT_INVALID: malformed evidence");
    });
    await expect(executor.execute(run.id)).resolves.toMatchObject({
      status: "failed",
      errorCode: "ANALYSIS_INPUT_INVALID",
      retryable: false,
    });
    expect(dependencies.fail).toHaveBeenCalledWith(
      run.id,
      "worker-1",
      expect.objectContaining({ retryable: false }),
    );
    expect(events).toEqual(["analysis.started", "analysis.failed"]);
  });

  it("classifies only approved transient failures as automatically retryable", () => {
    expect(
      classifyExecutionFailure(new Error("ANALYSIS_EXECUTION_TRANSIENT: timeout")),
    ).toMatchObject({
      code: "ANALYSIS_EXECUTION_TRANSIENT",
      retryable: true,
    });
    expect(classifyExecutionFailure(new Error("secret database detail"))).toEqual({
      code: "ANALYSIS_EXECUTION_FAILED",
      message: "Analysis execution failed safely",
      retryable: false,
    });
  });

  it("does nothing when another worker owns the claim", async () => {
    const { executor, dependencies, events } = harness(
      vi.fn(async () => ({ ...run, status: "completed" })),
    );
    vi.mocked(dependencies.claim).mockResolvedValueOnce(null);
    await expect(executor.execute(run.id)).resolves.toBeNull();
    expect(dependencies.publish).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });
});
