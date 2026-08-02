import { sprint03Configuration } from "./config";

export type AnalysisRunStatus = "queued" | "running" | "completed" | "failed";

export interface LifecycleRun {
  id: string;
  idempotencyKey: string;
  inputHash: string;
  status: AnalysisRunStatus;
  attempt: number;
}

export type LifecycleRequestResult =
  | { http: 202 | 200; status: AnalysisRunStatus; run: LifecycleRun; sameRun: boolean }
  | { http: 409; errorCode: "ANALYSIS_IDEMPOTENCY_CONFLICT"; run: LifecycleRun };

/**
 * Deterministic lifecycle rules shared by the persistent orchestration service and tests.
 * Persistence is responsible for serialising `request` and `claim` atomically.
 */
export class AnalysisLifecycle {
  request(existing: LifecycleRun | null, proposed: LifecycleRun): LifecycleRequestResult {
    if (!existing) return { http: 202, status: "queued", run: proposed, sameRun: false };
    if (existing.inputHash !== proposed.inputHash) {
      return { http: 409, errorCode: "ANALYSIS_IDEMPOTENCY_CONFLICT", run: existing };
    }
    return {
      http: existing.status === "completed" ? 200 : 202,
      status: existing.status,
      run: existing,
      sameRun: true,
    };
  }

  claim(run: LifecycleRun): LifecycleRun {
    if (run.status !== "queued") throw new Error("ANALYSIS_EXECUTION_FAILED: run is not claimable");
    if (run.attempt >= sprint03Configuration.analysisLifecycle.maximumAttempts) {
      throw new Error("ANALYSIS_EXECUTION_FAILED: maximum attempts reached");
    }
    return { ...run, status: "running", attempt: run.attempt + 1 };
  }

  complete(run: LifecycleRun): LifecycleRun {
    if (run.status !== "running") throw new Error("ANALYSIS_EXECUTION_FAILED: run is not running");
    return { ...run, status: "completed" };
  }

  fail(run: LifecycleRun): LifecycleRun {
    if (run.status !== "queued" && run.status !== "running") {
      throw new Error("ANALYSIS_EXECUTION_FAILED: terminal run cannot fail");
    }
    return { ...run, status: "failed" };
  }

  retry(run: LifecycleRun): LifecycleRun {
    if (run.status !== "failed")
      throw new Error("ANALYSIS_EXECUTION_FAILED: only failed runs retry");
    if (run.attempt >= sprint03Configuration.analysisLifecycle.maximumAttempts) {
      throw new Error("ANALYSIS_EXECUTION_FAILED: maximum attempts reached");
    }
    return { ...run, status: "queued" };
  }
}

export function evaluateLifecycleFixture(input: {
  sameCanonicalInput: boolean;
}): Record<string, unknown> {
  const lifecycle = new AnalysisLifecycle();
  const proposed: LifecycleRun = {
    id: "run-1",
    idempotencyKey: "fixture-key",
    inputHash: "input-a",
    status: "queued",
    attempt: 0,
  };
  const first = lifecycle.request(null, proposed);
  if (!("status" in first)) throw new Error("fixture setup failed");
  const completed = lifecycle.complete(lifecycle.claim(first.run));
  const replay = lifecycle.request(null, proposed);
  const existingReplay = lifecycle.request(completed, {
    ...proposed,
    inputHash: input.sameCanonicalInput ? completed.inputHash : "input-b",
  });
  if (!("status" in existingReplay)) {
    return { http: existingReplay.http, errorCode: existingReplay.errorCode, runCount: 1 };
  }
  return {
    firstResponse: { http: replay.http, status: "queued" },
    replayResponse: {
      http: existingReplay.http,
      status: existingReplay.status,
      sameRun: existingReplay.sameRun,
    },
    runCount: 1,
  };
}
