import * as assessmentRepo from "../assessment/repository.server";
import type { AssessmentResponse, AssessmentSession } from "../assessment/types";
import { lifecycleEvent } from "../audit/runtime-audit.server";
import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import * as executionRepo from "../orchestrator/repository.server";
import type { Execution } from "../orchestrator/types";
import {
  analysisIdempotencyKey,
  AnalysisValidationError,
  hashAnalysisInput,
  normaliseAnalysisInput,
} from "./normalizer";
import * as analysisRepo from "./repository.server";
import {
  ANALYSIS_MODEL_VERSION,
  type AnalysisEventType,
  type AssessmentAnalysisRun,
} from "./types";

export class AnalysisServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

export interface AnalysisTenantContext {
  ownerKey: string;
  organisationId: string;
  workspaceId: string;
  userId: string;
}

export interface AnalysisDependencies {
  getSession(id: string, ownerKey: string): Promise<AssessmentSession | null>;
  getResponses(id: string): Promise<AssessmentResponse[]>;
  findCompletedExecution(id: string, ownerKey: string): Promise<Execution | null>;
  loadPack(id: string, version: string): KnowledgePackDocument;
  findRun(key: string): Promise<AssessmentAnalysisRun | null>;
  latestRun(sessionId: string): Promise<AssessmentAnalysisRun | null>;
  createRun(input: Omit<AssessmentAnalysisRun, "id" | "createdAt">): Promise<AssessmentAnalysisRun>;
  publish(
    session: AssessmentSession,
    ownerKey: string,
    type: AnalysisEventType,
    payload: Record<string, unknown>,
    severity?: "info" | "warning" | "error",
  ): void;
  now(): string;
}

const dependencies: AnalysisDependencies = {
  getSession: assessmentRepo.getSession,
  getResponses: assessmentRepo.getResponses,
  findCompletedExecution: executionRepo.findCompletedExecutionForSession,
  loadPack: (id, version) => knowledgePackLoader.load(id, version),
  findRun: analysisRepo.findByIdempotencyKey,
  latestRun: analysisRepo.latestForSession,
  createRun: analysisRepo.createRun,
  publish: (session, ownerKey, type, payload, severity = "info") =>
    lifecycleEvent(session, ownerKey, type, payload, severity),
  now: () => new Date().toISOString(),
};

export class AssessmentAnalysisService {
  constructor(private readonly deps: AnalysisDependencies = dependencies) {}

  private async requireSession(sessionId: string, context: AnalysisTenantContext) {
    const session = await this.deps.getSession(sessionId, context.ownerKey);
    if (!session) throw new AnalysisServiceError("Assessment not found", 404, "not_found");
    if (
      session.organisationId !== context.organisationId ||
      session.workspaceId !== context.workspaceId ||
      session.createdByUserId !== context.userId
    ) {
      throw new AnalysisServiceError("Assessment not found", 404, "tenant_mismatch");
    }
    return session;
  }

  async analyse(sessionId: string, context: AnalysisTenantContext): Promise<AssessmentAnalysisRun> {
    const session = await this.requireSession(sessionId, context);
    const tenantEventContext = {
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
    };
    this.deps.publish(session, context.ownerKey, "analysis.started", {
      ...tenantEventContext,
      modelVersion: ANALYSIS_MODEL_VERSION,
    });

    try {
      const execution = await this.deps.findCompletedExecution(sessionId, context.ownerKey);
      if (!execution) {
        throw new AnalysisServiceError(
          "A completed, versioned runtime execution is required before analysis",
          409,
          "completed_execution_required",
        );
      }

      let pack: KnowledgePackDocument;
      try {
        pack = this.deps.loadPack(execution.knowledgePackId, execution.knowledgePackVersion);
      } catch (error) {
        throw new AnalysisServiceError(
          `Knowledge Pack ${execution.knowledgePackId}@${execution.knowledgePackVersion} is unavailable or invalid: ${error instanceof Error ? error.message : "unknown error"}`,
          422,
          "knowledge_pack_invalid",
        );
      }

      const input = normaliseAnalysisInput({
        session,
        responses: await this.deps.getResponses(sessionId),
        pack,
      });
      const inputHash = await hashAnalysisInput(input);
      const idempotencyKey = analysisIdempotencyKey(input, inputHash);
      const existing = await this.deps.findRun(idempotencyKey);
      if (existing) {
        this.deps.publish(session, context.ownerKey, "analysis.reused", {
          ...tenantEventContext,
          analysisRunId: existing.id,
          inputHash,
          idempotencyKey,
        });
        return existing;
      }

      const completedAt = this.deps.now();
      let run: AssessmentAnalysisRun;
      try {
        run = await this.deps.createRun({
          assessmentSessionId: session.id,
          runtimeExecutionId: execution.id,
          organisationId: session.organisationId,
          workspaceId: session.workspaceId,
          createdByUserId: session.createdByUserId,
          knowledgePackId: pack.manifest.id,
          knowledgePackVersion: pack.manifest.version,
          schemaVersion: input.schemaVersion,
          modelVersion: input.modelVersion,
          inputHash,
          idempotencyKey,
          responseCount: input.responses.length,
          input,
          completedAt,
        });
      } catch (error) {
        const raced = await this.deps.findRun(idempotencyKey);
        if (!raced) throw error;
        run = raced;
      }

      this.deps.publish(session, context.ownerKey, "analysis.completed", {
        ...tenantEventContext,
        analysisRunId: run.id,
        runtimeExecutionId: execution.id,
        knowledgePackId: run.knowledgePackId,
        knowledgePackVersion: run.knowledgePackVersion,
        inputHash,
        responseCount: run.responseCount,
      });
      return run;
    } catch (error) {
      const mapped =
        error instanceof AnalysisServiceError
          ? error
          : error instanceof AnalysisValidationError
            ? new AnalysisServiceError(error.message, error.status, error.code)
            : new AnalysisServiceError(
                error instanceof Error ? error.message : "Analysis failed",
                500,
                "analysis_failed",
              );
      this.deps.publish(
        session,
        context.ownerKey,
        "analysis.failed",
        { ...tenantEventContext, code: mapped.code, error: mapped.message },
        "error",
      );
      throw mapped;
    }
  }

  async latest(
    sessionId: string,
    context: AnalysisTenantContext,
  ): Promise<AssessmentAnalysisRun | null> {
    await this.requireSession(sessionId, context);
    return this.deps.latestRun(sessionId);
  }
}

export const assessmentAnalysisService = new AssessmentAnalysisService();
