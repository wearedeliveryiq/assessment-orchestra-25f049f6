import * as assessmentRepo from "../assessment/repository.server";
import * as executionRepo from "../orchestrator/repository.server";
import { SPRINT03_CONFIGURATION_SET_ID } from "../delivery-intelligence/config";
import { driveAnalysisRun } from "./executor.server";
import {
  ANALYSIS_ELIGIBILITY_EVALUATOR_VERSION,
  ANALYSIS_ELIGIBILITY_POLICY_ID,
  ANALYSIS_ELIGIBILITY_POLICY_VERSION,
  evaluateAnalysisEligibility,
} from "./eligibility";
import { retryRun } from "./repository.server";
import * as handoffRepo from "./handoff-repository.server";
import type { AssessmentAnalysisHandoff, AnalysisHandoffView } from "./handoff-types";
import { AnalysisServiceError, assessmentAnalysisService } from "./service.server";

const SAFE_HANDOFF_ERROR = "ANALYSIS_HANDOFF_FAILED";

export interface AnalysisHandoffContext {
  ownerKey: string;
  organisationId: string;
  workspaceId: string;
  userId: string;
}

export interface HandoffDependencies {
  getSession: typeof assessmentRepo.getSession;
  getSessionById: typeof assessmentRepo.getSessionById;
  getResponses: typeof assessmentRepo.getResponses;
  findCompletedExecution: typeof executionRepo.findCompletedExecutionForSession;
  ensureHandoff: typeof handoffRepo.ensureHandoff;
  getHandoff: typeof handoffRepo.getHandoff;
  claimHandoffs: typeof handoffRepo.claimHandoffs;
  claimHandoff: typeof handoffRepo.claimHandoff;
  completeHandoff: typeof handoffRepo.completeHandoff;
  failHandoff: typeof handoffRepo.failHandoff;
  reconcileHandoffs: typeof handoffRepo.reconcileHandoffs;
  appendEvent: typeof handoffRepo.appendHandoffEvent;
  persistEligibilityDecision: typeof handoffRepo.persistEligibilityDecision;
  getEligibilityDecision: typeof handoffRepo.getEligibilityDecision;
  attachEligibilityDecision: typeof handoffRepo.attachEligibilityDecision;
  markHandoffIneligible: typeof handoffRepo.markHandoffIneligible;
  requestAnalysis: typeof assessmentAnalysisService.request;
  latestRun: typeof assessmentAnalysisService.latest;
  driveRun: typeof driveAnalysisRun;
  retryRun: typeof retryRun;
  now: () => number;
}

const dependencies: HandoffDependencies = {
  getSession: assessmentRepo.getSession,
  getSessionById: assessmentRepo.getSessionById,
  getResponses: assessmentRepo.getResponses,
  findCompletedExecution: executionRepo.findCompletedExecutionForSession,
  ensureHandoff: handoffRepo.ensureHandoff,
  getHandoff: handoffRepo.getHandoff,
  claimHandoffs: handoffRepo.claimHandoffs,
  claimHandoff: handoffRepo.claimHandoff,
  completeHandoff: handoffRepo.completeHandoff,
  failHandoff: handoffRepo.failHandoff,
  reconcileHandoffs: handoffRepo.reconcileHandoffs,
  appendEvent: handoffRepo.appendHandoffEvent,
  persistEligibilityDecision: handoffRepo.persistEligibilityDecision,
  getEligibilityDecision: handoffRepo.getEligibilityDecision,
  attachEligibilityDecision: handoffRepo.attachEligibilityDecision,
  markHandoffIneligible: handoffRepo.markHandoffIneligible,
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

  async ensureForAssessment(assessmentId: string, context: AnalysisHandoffContext) {
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

  /**
   * Claims and processes only the hand-off created by this completion request.
   *
   * The caller awaits this method after the assessment transaction has committed.
   * That prevents a serverless request from being torn down after it has claimed a
   * durable outbox row but before it has created the analysis run. Concurrent
   * completion requests remain safe because the database claim is atomic.
   */
  async processAssessmentCompletion(assessmentId: string, context: AnalysisHandoffContext) {
    const handoff = await this.ensureForAssessment(assessmentId, context);
    if (handoff.status !== "pending") return null;
    const claimed = await this.deps.claimHandoff(handoff.id);
    if (!claimed) return null;
    return this.processClaimed(claimed);
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
    const execution = await this.deps.findCompletedExecution(
      handoff.assessmentSessionId,
      verifiedOwnerKey,
    );
    if (!execution) {
      throw new AnalysisServiceError(
        "Required immutable version is unavailable",
        409,
        "ANALYSIS_VERSION_UNAVAILABLE",
      );
    }
    const responses = await this.deps.getResponses(handoff.assessmentSessionId);
    const evaluation = await evaluateAnalysisEligibility({
      assessmentId: session.id,
      assessmentRevision: session.assessmentRevision ?? 1,
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
      expectedOrganisationId: handoff.organisationId,
      expectedWorkspaceId: handoff.workspaceId,
      completed: session.status === "completed" && Boolean(session.completedAt),
      assessmentType: session.assessmentType,
      packId: execution.knowledgePackId,
      packVersion: execution.knowledgePackVersion,
      questionSetId: execution.knowledgePackId,
      questionSetVersion: execution.knowledgePackVersion,
      questionIds: responses.map((response) => response.questionId),
      configurationSetId: handoff.configurationSetId,
    });
    const decision = await this.deps.persistEligibilityDecision({
      handoff_id: handoff.id,
      assessment_session_id: session.id,
      organisation_id: handoff.organisationId,
      workspace_id: handoff.workspaceId,
      assessment_revision: handoff.assessmentRevision,
      configuration_set_id: SPRINT03_CONFIGURATION_SET_ID,
      assessment_type: session.assessmentType,
      knowledge_pack_id: execution.knowledgePackId,
      knowledge_pack_version: execution.knowledgePackVersion,
      question_set_id: execution.knowledgePackId,
      question_set_version: execution.knowledgePackVersion,
      assessment_manifest_digest: evaluation.assessmentManifestDigest,
      configured_manifest_digest: evaluation.configuredManifestDigest,
      status: evaluation.status,
      primary_reason_code: evaluation.primaryReason,
      secondary_reason_codes: evaluation.secondaryReasons,
      policy_id: ANALYSIS_ELIGIBILITY_POLICY_ID,
      policy_version: ANALYSIS_ELIGIBILITY_POLICY_VERSION,
      evaluator_version: ANALYSIS_ELIGIBILITY_EVALUATOR_VERSION,
      correlation_id: handoff.correlationId,
    });
    await this.deps.appendEvent(handoff, "analysis.eligibility_evaluated", {
      eligibilityDecisionId: decision.id,
      eligibilityStatus: decision.status,
      reasonCode: decision.primaryReasonCode,
      policyId: ANALYSIS_ELIGIBILITY_POLICY_ID,
      policyVersion: ANALYSIS_ELIGIBILITY_POLICY_VERSION,
    });
    if (decision.status === "ineligible") {
      await this.deps.markHandoffIneligible(handoff.id, decision.id);
      await this.deps.appendEvent(handoff, "analysis.ineligible_terminal", {
        eligibilityDecisionId: decision.id,
        reasonCode: decision.primaryReasonCode,
      });
      return null;
    }
    await this.deps.attachEligibilityDecision(handoff.id, decision.id);
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
    if (handoff.status === "ineligible") {
      throw new AnalysisServiceError(
        "Analysis retry is not available",
        409,
        "ANALYSIS_RETRY_NOT_AVAILABLE",
      );
    }
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
    const eligibility = await this.deps.getEligibilityDecision(assessmentId, context);
    if (eligibility?.status === "ineligible") {
      return {
        state: "ineligible",
        analysisRunId: eligibility.analysisRunId,
        retryable: false,
        completedAt: session.completedAt,
        safeMessage:
          "This assessment was completed using an earlier or different question set that isn’t compatible with the current Delivery DNA analysis. Your assessment is complete and your responses are safe.",
        supportReference: eligibility.correlationId,
        canViewAssessment: true,
        canStartDeliveryDna: false,
      };
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

export async function scheduleAnalysisHandoff(
  assessmentId: string,
  context: AnalysisHandoffContext,
): Promise<void> {
  await analysisHandoffService.processAssessmentCompletion(assessmentId, context).catch((error) => {
    console.error("[analysis-handoff] automatic hand-off will be retried", safeCode(error));
  });
}
