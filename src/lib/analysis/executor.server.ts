import * as repository from "./repository.server";
import type { AssessmentAnalysisRun } from "./types";

const locallyRunning = new Map<string, Promise<AssessmentAnalysisRun | null>>();

export interface AnalysisExecutorDependencies {
  claim(id: string, owner: string, leaseSeconds?: number): Promise<AssessmentAnalysisRun | null>;
  complete(id: string, owner: string): Promise<AssessmentAnalysisRun>;
  fail(
    id: string,
    owner: string,
    error: { code: string; message: string; retryable: boolean },
  ): Promise<AssessmentAnalysisRun>;
  event(
    run: AssessmentAnalysisRun,
    type: string,
    payload: Record<string, unknown>,
    severity?: string,
  ): Promise<void>;
  execute(run: AssessmentAnalysisRun): Promise<void>;
  workerId(): string;
}

const defaultDependencies: AnalysisExecutorDependencies = {
  claim: repository.claimRun,
  complete: repository.completeRun,
  fail: repository.failRun,
  event: repository.appendEvent,
  // S3-001 deliberately performs no scoring, narrative or recommendation work.
  // Later Sprint stories replace this domain callback with canonical result publication.
  execute: async () => undefined,
  workerId: () => `analysis-worker:${crypto.randomUUID()}`,
};

export class AnalysisRunExecutor {
  constructor(private readonly deps: AnalysisExecutorDependencies = defaultDependencies) {}

  async execute(runId: string): Promise<AssessmentAnalysisRun | null> {
    const workerId = this.deps.workerId();
    const claimed = await this.deps.claim(runId, workerId, 120);
    if (!claimed) return null;
    await this.deps.event(claimed, "analysis.started", {
      attempt: claimed.attempt,
      worker: workerId,
    });
    try {
      await this.deps.execute(claimed);
      const completed = await this.deps.complete(runId, workerId);
      await this.deps.event(completed, "analysis.completed", {
        attempt: completed.attempt,
        configurationSetId: completed.configurationSetId,
        inputHash: completed.inputHash,
      });
      return completed;
    } catch (error) {
      const classification = classifyExecutionFailure(error);
      const failed = await this.deps.fail(runId, workerId, classification);
      await this.deps.event(
        failed,
        "analysis.failed",
        { attempt: failed.attempt, code: classification.code, retryable: classification.retryable },
        "error",
      );
      return failed;
    }
  }
}

export function classifyExecutionFailure(error: unknown) {
  const code = error instanceof Error ? error.message.split(":", 1)[0] : "";
  if (code === "ANALYSIS_CONFIGURATION_INVALID" || code === "ANALYSIS_INPUT_INVALID") {
    return { code, message: "Analysis input or configuration is invalid", retryable: false };
  }
  if (code === "ANALYSIS_EXECUTION_TRANSIENT") {
    return { code, message: "A temporary analysis dependency failed", retryable: true };
  }
  return {
    code: "ANALYSIS_EXECUTION_FAILED",
    message: "Analysis execution failed safely",
    retryable: false,
  };
}

export async function driveAnalysisRun(runId: string): Promise<AssessmentAnalysisRun | null> {
  const current = locallyRunning.get(runId);
  if (current) return current;
  const task = new AnalysisRunExecutor().execute(runId).finally(() => locallyRunning.delete(runId));
  locallyRunning.set(runId, task);
  return task;
}
