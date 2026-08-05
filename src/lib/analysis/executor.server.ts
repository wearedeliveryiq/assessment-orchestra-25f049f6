import * as repository from "./repository.server";
import { analyseCanonicalInput } from "../delivery-intelligence/engine";
import { analyseCanonicalInputV2 } from "../delivery-dna/analysis-v2";
import { DELIVERY_DNA_V2_CONFIGURATION_SET_ID } from "../delivery-dna/catalogue-v2";
import { publishResult } from "../delivery-intelligence/result-repository.server";
import { buildCoreTrace } from "../delivery-intelligence/trace-builder";
import { validateTraceGraph } from "../delivery-intelligence/traceability";
import { recommendationConfidenceGateService } from "../recommendation-confidence/service.server";
import { recommendationEvaluationService } from "../recommendation-evaluation/service.server";
import { recommendationPriorityService } from "../recommendation-priority/service.server";
import { recommendationPortfolioService } from "../recommendation-portfolio/service.server";
import { recommendationResolutionService } from "../recommendation-resolution/service.server";
import { recommendationSequenceService } from "../recommendation-sequencing/service.server";
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
  prioritiseRecommendations?(run: AssessmentAnalysisRun): Promise<void>;
  sequenceRecommendations?(run: AssessmentAnalysisRun): Promise<void>;
  publishRecommendationPortfolio?(run: AssessmentAnalysisRun): Promise<void>;
  workerId(): string;
}

const defaultDependencies: AnalysisExecutorDependencies = {
  claim: repository.claimRun,
  fail: repository.failRun,
  event: repository.appendEvent,
  publish: async (run, owner) => {
    const core =
      run.configurationSetId === DELIVERY_DNA_V2_CONFIGURATION_SET_ID
        ? analyseCanonicalInputV2(run.input)
        : analyseCanonicalInput(run.input);
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
    return publishResult(run, owner, canonicalResult as Parameters<typeof publishResult>[2], trace);
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
  prioritiseRecommendations: async (run) => {
    await recommendationPriorityService.prioritise(run);
  },
  sequenceRecommendations: async (run) => {
    await recommendationSequenceService.sequence(run);
  },
  publishRecommendationPortfolio: async (run) => {
    await recommendationPortfolioService.publish(run);
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
      const usesLegacyRecommendationPipeline =
        completed.configurationSetId !== DELIVERY_DNA_V2_CONFIGURATION_SET_ID;
      if (usesLegacyRecommendationPipeline && this.deps.evaluateRecommendations) {
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
      let recommendationConflictResolutionCompleted = false;
      if (recommendationConfidenceGateCompleted && this.deps.resolveRecommendationConflicts) {
        try {
          await this.deps.resolveRecommendationConflicts(completed);
          recommendationConflictResolutionCompleted = true;
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
      let recommendationPriorityCompleted = false;
      if (recommendationConflictResolutionCompleted && this.deps.prioritiseRecommendations) {
        try {
          await this.deps.prioritiseRecommendations(completed);
          recommendationPriorityCompleted = true;
          await this.deps.event(completed, "recommendation.priority_completed", {
            policyVersion: "PB-004/S4-005/1.0.0",
          });
        } catch {
          await this.deps.event(
            completed,
            "recommendation.priority_failed",
            { code: "RECOMMENDATION_PRIORITY_INVALID" },
            "error",
          );
        }
      }
      let recommendationSequenceCompleted = false;
      if (recommendationPriorityCompleted && this.deps.sequenceRecommendations) {
        try {
          await this.deps.sequenceRecommendations(completed);
          recommendationSequenceCompleted = true;
          await this.deps.event(completed, "recommendation.sequence_completed", {
            policyVersion: "PB-004/S4-006/1.0.0",
          });
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String(error.code)
              : "RECOMMENDATION_SEQUENCE_INVALID";
          await this.deps.event(
            completed,
            "recommendation.sequence_failed",
            {
              code: code === "ROADMAP_DEPENDENCY_CYCLE" ? code : "RECOMMENDATION_SEQUENCE_INVALID",
            },
            "error",
          );
        }
      }
      if (recommendationSequenceCompleted && this.deps.publishRecommendationPortfolio) {
        try {
          await this.deps.publishRecommendationPortfolio(completed);
          await this.deps.event(completed, "recommendation.portfolio_completed", {
            policyVersion: "PB-004/S4-007/1.0.0",
          });
        } catch {
          await this.deps.event(
            completed,
            "recommendation.portfolio_failed",
            { code: "PORTFOLIO_PUBLICATION_FAILED" },
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
