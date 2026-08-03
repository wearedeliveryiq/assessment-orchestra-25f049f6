import * as repository from "./repository.server";
import { analyseCanonicalInput } from "../delivery-intelligence/engine";
import { publishResult } from "../delivery-intelligence/result-repository.server";
import { buildCoreTrace } from "../delivery-intelligence/trace-builder";
import { validateTraceGraph } from "../delivery-intelligence/traceability";
import { recommendationConfidenceGateService } from "../recommendation-confidence/service.server";
import { recommendationEvaluationService } from "../recommendation-evaluation/service.server";
import { recommendationResolutionService } from "../recommendation-resolution/service.server";
import type { AssessmentAnalysisRun } from "./types";

const locallyRunning = new Map<string, Promise<AssessmentAnalysisRun | null>>();

export interface AnalysisExecutorDependencies {
  claim(id: string, owner: string, leaseSeconds?: number): Promise<AssessmentAnalysisRun | null>;
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
  publish(run: AssessmentAnalysisRun, owner: string): Promise<AssessmentAnalysisRun>;
  evaluateRecommendations?(run: AssessmentAnalysisRun): Promise<void>;
  gateRecommendations?(run: AssessmentAnalysisRun): Promise<void>;
  resolveRecommendationConflicts?(run: AssessmentAnalysisRun): Promise<void>;
  workerId(): string;
}

const defaultDependencies: AnalysisExecutorDependencies = {
  claim: repository.claimRun,
  fail: repository.failRun,
  event: repository.appendEvent,
  publish: async (run, owner) => {
    const core = analyseCanonicalInput(run.input);
    const canonicalResult = {
      ...core,
      analysisRunId: run.id,
      generatedAt: run.startedAt ?? run.queuedAt,
    };
    const trace = await buildCoreTrace(run, core);
    const validation = validateTraceGraph(trace);
    if (!validation.valid) {
      throw new Error(`ANALYSIS_TRACE_INCOMPLETE: ${validation.errors.join(",")}`);
    }
    return publishResult(run, owner, canonicalResult, trace);
  },
  evaluateRecommendations: async (run) => {
    await recommendationEvaluationService.evaluate(run);
  },
  gateRecommendations: async (run) => {
    await recommendationConfidenceGateService.evaluate(run);
  },
  resolveRecommendationConflicts: async (run) => {
    await recommendationResolutionService.resolve(run);
  },
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
      const completed = await this.deps.publish(claimed, workerId);
      await this.deps.event(completed, "analysis.completed", {
        attempt: completed.attempt,
        configurationSetId: completed.configurationSetId,
        inputHash: completed.inputHash,
      });
      let recommendationEvaluationCompleted = false;
      if (this.deps.evaluateRecommendations) {
        try {
          await this.deps.evaluateRecommendations(completed);
          recommendationEvaluationCompleted = true;
          await this.deps.event(completed, "recommendation.evaluation_completed", {
            policyVersion: "PB-004/S4-002/1.0.0",
          });
        } catch {
          await this.deps.event(
            completed,
            "recommendation.evaluation_failed",
            { code: "RECOMMENDATION_EVALUATION_INVALID" },
            "error",
          );
        }
      }
      let recommendationConfidenceGateCompleted = false;
      if (recommendationEvaluationCompleted && this.deps.gateRecommendations) {
        try {
          await this.deps.gateRecommendations(completed);
          recommendationConfidenceGateCompleted = true;
          await this.deps.event(completed, "recommendation.confidence_gate_completed", {
            policyVersion: "PB-004/S4-003/1.0.0",
          });
        } catch {
          await this.deps.event(
            completed,
            "recommendation.confidence_gate_failed",
            { code: "RECOMMENDATION_EVALUATION_INVALID" },
            "error",
          );
        }
      }
      if (recommendationConfidenceGateCompleted && this.deps.resolveRecommendationConflicts) {
        try {
          await this.deps.resolveRecommendationConflicts(completed);
          await this.deps.event(completed, "recommendation.conflict_resolution_completed", {
            policyVersion: "PB-004/S4-004/1.0.0",
          });
        } catch {
          await this.deps.event(
            completed,
            "recommendation.conflict_resolution_failed",
            { code: "RECOMMENDATION_RESOLUTION_INVALID" },
            "error",
          );
        }
      }
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
  if (
    code === "ANALYSIS_CONFIGURATION_INVALID" ||
    code === "ANALYSIS_INPUT_INVALID" ||
    code === "ANALYSIS_TRACE_INCOMPLETE"
  ) {
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

/** Approved retry schedule: first transient retry after 5s, second after 30s. */
export function retryDelayMs(attempt: number): number | null {
  if (attempt === 1) return 5_000;
  if (attempt === 2) return 30_000;
  return null;
}

export function isRetryDue(
  run: Pick<AssessmentAnalysisRun, "status" | "retryable" | "attempt" | "failedAt">,
  now = Date.now(),
) {
  const delay = retryDelayMs(run.attempt);
  return (
    run.status === "failed" &&
    run.retryable === true &&
    delay != null &&
    run.failedAt != null &&
    now >= new Date(run.failedAt).getTime() + delay
  );
}

export async function driveAnalysisRun(runId: string): Promise<AssessmentAnalysisRun | null> {
  const current = locallyRunning.get(runId);
  if (current) return current;
  const task = new AnalysisRunExecutor().execute(runId).finally(() => locallyRunning.delete(runId));
  locallyRunning.set(runId, task);
  return task;
}
