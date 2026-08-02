import * as assessmentRepo from "../assessment/repository.server";
import { driveAnalysisRun } from "./executor.server";
import { retryRun } from "./repository.server";
import * as handoffRepo from "./handoff-repository.server";
import type { AssessmentAnalysisHandoff, AnalysisHandoffView } from "./handoff-types";
import { AnalysisServiceError, assessmentAnalysisService } from "./service.server";

const SAFE_HANDOFF_ERROR = "ANALYSIS_HANDOFF_FAILED";

export interface HandoffDependencies {
  getSession: typeof assessmentRepo.getSession;
  getSessionById: typeof assessmentRepo.getSessionById;
  ensureHandoff: typeof handoffRepo.ensureHandoff;
  getHandoff: typeof handoffRepo.getHandoff;
  claimHandoffs: typeof handoffRepo.claimHandoffs;
  claimHandoff: typeof handoffRepo.claimHandoff;
  completeHandoff: typeof handoffRepo.completeHandoff;
  failHandoff: typeof handoffRepo.failHandoff;
  reconcileHandoffs: typeof handoffRepo.reconcileHandoffs;
  appendEvent: typeof handoffRepo.appendHandoffEvent;
  requestAnalysis: typeof assessmentAnalysisService.request;
  latestRun: typeof assessmentAnalysisService.latest;
  driveRun: typeof driveAnalysisRun;
  retryRun: typeof retryRun;
  now: () => number;
}

const dependencies: HandoffDependencies = {
  getSession: assessmentRepo.getSession,
  getSessionById: assessmentRepo.getSessionById,
  ensureHandoff: handoffRepo.ensureHandoff,
  getHandoff: handoffRepo.getHandoff,
  claimHandoffs: handoffRepo.claimHandoffs,
  claimHandoff: handoffRepo.claimHandoff,
  completeHandoff: handoffRepo.completeHandoff,
  failHandoff: handoffRepo.failHandoff,
  reconcileHandoffs: handoffRepo.reconcileHandoffs,
  appendEvent: handoffRepo.appendHandoffEvent,
  requestAnalysis: assessmentAnalysisService.request.bind(assessmentAnalysisService),
  latestRun: assessmentAnalysisService.latest.bind(assessmentAnalysisService),
  driveRun: driveAnalysisRun,
  retryRun,
  now: () => Date.now(),
};

function safeCode(error: unknown): string {
  return error instanceof AnalysisServiceError ? error.code : SAFE_HANDOFF_ERROR;
}

export class AnalysisHandoffService {
  constructor(private readonly deps: HandoffDependencies = dependencies) {}

  async ensureForAssessment(
    assessmentId: string,
    context: {
      ownerKey: string;
      organisationId: string;
      workspaceId: string;
      userId: string;
    },
  ) {
    const session = await this.deps.getSession(assessmentId, context.ownerKey);
    if (
      !session ||
      session.organisationId !== context.organisationId ||
      session.workspaceId !== context.workspaceId
    ) {
      throw new AnalysisServiceError(
        "Analysis resource is not available",
        404,
        "ANALYSIS_ACCESS_DENIED",
      );
    }
    if (session.status !== "completed" || !session.completedAt) {
      throw new AnalysisServiceError(
        "Assessment is not complete",
        409,
        "ANALYSIS_ASSESSMENT_INCOMPLETE",
      );
    }
    return this.deps.ensureHandoff(session);
  }

  async processClaimed(handoff: AssessmentAnalysisHandoff) {
    const session = await this.deps.getSessionById(handoff.assessmentSessionId);
    if (
      !session ||
      session.organisationId !== handoff.organisationId ||
      session.workspaceId !== handoff.workspaceId ||
      session.assessmentRevision !== handoff.assessmentRevision
    ) {
      throw new Error("ANALYSIS_ACCESS_DENIED");
    }
    const verifiedOwnerKey = `${session.createdByUserId}:${session.workspaceId}`;
    let requested: Awaited<ReturnType<HandoffDependencies["requestAnalysis"]>>;
    try {
      await this.deps.appendEvent(handoff, "analysis.requested", {
        assessmentRevision: handoff.assessmentRevision,
        configurationSetId: handoff.configurationSetId,
      });
      requested = await this.deps.requestAnalysis(
        { assessmentId: handoff.assessmentSessionId, requestedMode: handoff.requestedMode },
        {
          ownerKey: verifiedOwnerKey,
          organisationId: handoff.organisationId,
          workspaceId: handoff.workspaceId,
          userId: session.createdByUserId,
          correlationId: handoff.correlationId,
        },
      );
      await this.deps.appendEvent(
        handoff,
        requested.reused ? "analysis.request_reused" : "analysis.request_created",
        { analysisRunId: requested.run.id },
      );
      await this.deps.completeHandoff(handoff.id, requested.run.id);
    } catch (error) {
      const code = safeCode(error);
      const failed = await this.deps.failHandoff(handoff.id, code);
      await this.deps.appendEvent(
        failed,
        "analysis.handoff_failed",
        { attempt: failed.attempt },
        code,
      );
      throw error;
    }
    let run = requested.run;
    try {
      if (run.status === "failed" && run.retryable) {
        run = (await this.deps.retryRun(run.id)) ?? run;
      }
      if (run.status === "queued" || run.status === "running") {
        await this.deps.driveRun(run.id);
      }
    } catch (error) {
      console.error("[analysis-handoff] analysis execution will retry", safeCode(error));
    }
    return run;
  }

  async processPending(limit = 10): Promise<{ processed: number; failed: number }> {
    const claimed = await this.deps.claimHandoffs(limit);
    let processed = 0;
    let failed = 0;
    for (const handoff of claimed) {
      try {
        await this.processClaimed(handoff);
        processed += 1;
      } catch {
        failed += 1;
      }
    }
    return { processed, failed };
  }

  async reconcile(limit = 100) {
    const created = await this.deps.reconcileHandoffs(limit);
    const processed = await this.processPending(limit);
    return { created, ...processed };
  }

  async requestRetry(
    assessmentId: string,
    context: {
      ownerKey: string;
      organisationId: string;
      workspaceId: string;
      userId: string;
    },
  ) {
    const handoff = await this.ensureForAssessment(assessmentId, context);
    await this.deps.appendEvent(handoff, "analysis.user_retry_requested", {
      assessmentRevision: handoff.assessmentRevision,
      configurationSetId: handoff.configurationSetId,
    });
    let latest = await this.deps.latestRun(assessmentId, context);
    if (!latest) {
      const retrySession = await this.deps.getSession(assessmentId, context.ownerKey);
      const completedAt = Date.parse(retrySession?.completedAt ?? "");
      if (
        handoff.status !== "failed" &&
        (Number.isNaN(completedAt) || this.deps.now() - completedAt < 15_000)
      ) {
        throw new AnalysisServiceError(
          "Delivery Intelligence is still being prepared",
          409,
          "ANALYSIS_RETRY_NOT_AVAILABLE",
        );
      }
      const claimed = await this.deps.claimHandoff(handoff.id);
      if (claimed) await this.processClaimed(claimed);
      latest = await this.deps.latestRun(assessmentId, context);
    } else if (latest.status === "failed" && latest.retryable) {
      latest =
        (await this.deps.retryRun(latest.id)) ??
        (await this.deps.latestRun(assessmentId, context)) ??
        latest;
      await this.deps.appendEvent(handoff, "analysis.retry_reused", { analysisRunId: latest.id });
      if (latest.status === "queued" || latest.status === "running") {
        await this.deps.driveRun(latest.id);
      }
    } else if (latest.status === "queued" || latest.status === "running") {
      await this.deps.appendEvent(handoff, "analysis.retry_reused", {
        analysisRunId: latest.id,
        status: latest.status,
      });
      await this.deps.driveRun(latest.id);
    } else {
      throw new AnalysisServiceError(
        "Analysis retry is not available",
        409,
        "ANALYSIS_RETRY_NOT_AVAILABLE",
      );
    }
    if (!latest) {
      throw new AnalysisServiceError(
        "We couldn't start your Delivery Intelligence. Your assessment is safe.",
        503,
        SAFE_HANDOFF_ERROR,
      );
    }
    return latest;
  }

  async view(
    assessmentId: string,
    context: { ownerKey: string; organisationId: string; workspaceId: string; userId: string },
  ): Promise<AnalysisHandoffView> {
    const session = await this.deps.getSession(assessmentId, context.ownerKey);
    if (!session) {
      throw new AnalysisServiceError(
        "Analysis resource is not available",
        404,
        "ANALYSIS_ACCESS_DENIED",
      );
    }
    const run = await this.deps.latestRun(assessmentId, context);
    if (run) {
      if (run.status === "completed") {
        return {
          state: "completed",
          analysisRunId: run.id,
          retryable: false,
          completedAt: run.completedAt,
          safeMessage: "Your Delivery Intelligence is ready.",
          supportReference: null,
        };
      }
      if (run.status === "failed") {
        return {
          state: "failed",
          analysisRunId: run.id,
          retryable: run.retryable === true,
          completedAt: session.completedAt,
          safeMessage: "We couldn't generate your Delivery Intelligence. Your assessment is safe.",
          supportReference: run.correlationId,
        };
      }
      return {
        state: run.status,
        analysisRunId: run.id,
        retryable: false,
        completedAt: session.completedAt,
        safeMessage: "Analysing your Delivery DNA…",
        supportReference: null,
      };
    }
    const handoff = await this.deps.getHandoff(assessmentId, context);
    const elapsed = session.completedAt ? this.deps.now() - Date.parse(session.completedAt) : 0;
    const missing = handoff?.status === "failed" || elapsed >= 15_000;
    return {
      state: missing ? "missing" : "preparing",
      analysisRunId: null,
      retryable: missing,
      completedAt: session.completedAt,
      safeMessage: missing
        ? "We couldn't start your Delivery Intelligence. Your assessment is safe."
        : "Preparing your Delivery Intelligence…",
      supportReference: handoff?.correlationId ?? null,
    };
  }
}

export const analysisHandoffService = new AnalysisHandoffService();

export function scheduleAnalysisHandoff(): void {
  void analysisHandoffService.processPending(10).catch((error) => {
    console.error("[analysis-handoff] automatic hand-off will be retried", safeCode(error));
  });
}
