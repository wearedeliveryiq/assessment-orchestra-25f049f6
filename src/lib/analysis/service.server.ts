import * as assessmentRepo from "../assessment/repository.server";
import type { AssessmentResponse, AssessmentSession } from "../assessment/types";
import { componentDigests, sprint03Configuration } from "../delivery-intelligence/config";
import {
  DELIVERY_DNA_V2_CONFIGURATION_DIGEST,
  DELIVERY_DNA_V2_CONFIGURATION_SET_ID,
  DELIVERY_DNA_V2_VERSION,
  deliveryDnaV2Catalogue,
} from "../delivery-dna/catalogue-v2";
import * as executionRepo from "../orchestrator/repository.server";
import type { Execution } from "../orchestrator/types";
import {
  AnalysisValidationError,
  deriveAnalysisIdempotencyKey,
  hashAnalysisInput,
  normaliseAnalysisInput,
} from "./normalizer";
import type { AnalysisQuestionSet } from "./normalizer";
import { loadAnalysisQuestionSet } from "./question-set.server";
import * as analysisRepo from "./repository.server";
import type { AnalysisRequestedMode, AssessmentAnalysisRun } from "./types";

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
  correlationId?: string;
}

export interface RequestAnalysisInput {
  assessmentId: string;
  requestedMode: AnalysisRequestedMode;
  idempotencyKey?: string;
}

export interface AnalysisDependencies {
  getSession(id: string, ownerKey: string): Promise<AssessmentSession | null>;
  getResponses(id: string): Promise<AssessmentResponse[]>;
  findCompletedExecution(id: string, ownerKey: string): Promise<Execution | null>;
  loadPack(id: string, version: string): AnalysisQuestionSet;
  findRun(
    key: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<AssessmentAnalysisRun | null>;
  getRun(
    id: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<AssessmentAnalysisRun | null>;
  latestRun(
    sessionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<AssessmentAnalysisRun | null>;
  createRun(
    input: Omit<AssessmentAnalysisRun, "id" | "createdAt" | "updatedAt">,
  ): Promise<AssessmentAnalysisRun>;
  appendEvent(
    run: AssessmentAnalysisRun,
    type: string,
    payload: Record<string, unknown>,
    severity?: string,
  ): Promise<void>;
  now(): string;
}

const dependencies: AnalysisDependencies = {
  getSession: assessmentRepo.getSession,
  getResponses: assessmentRepo.getResponses,
  findCompletedExecution: executionRepo.findCompletedExecutionForSession,
  loadPack: loadAnalysisQuestionSet,
  findRun: analysisRepo.findByIdempotencyKey,
  getRun: analysisRepo.getRun,
  latestRun: analysisRepo.latestForSession,
  createRun: analysisRepo.createRun,
  appendEvent: analysisRepo.appendEvent,
  now: () => new Date().toISOString(),
};

export class AssessmentAnalysisService {
  constructor(private readonly deps: AnalysisDependencies = dependencies) {}

  private tenant(context: AnalysisTenantContext) {
    return { organisationId: context.organisationId, workspaceId: context.workspaceId };
  }

  private async requireSession(sessionId: string, context: AnalysisTenantContext) {
    const session = await this.deps.getSession(sessionId, context.ownerKey);
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
    return session;
  }

  async request(input: RequestAnalysisInput, context: AnalysisTenantContext) {
    const session = await this.requireSession(input.assessmentId, context);
    const execution = await this.deps.findCompletedExecution(input.assessmentId, context.ownerKey);
    if (!execution) {
      throw new AnalysisServiceError(
        "Required immutable version is unavailable",
        409,
        "ANALYSIS_VERSION_UNAVAILABLE",
      );
    }
    let pack: AnalysisQuestionSet;
    try {
      pack = this.deps.loadPack(execution.knowledgePackId, execution.knowledgePackVersion);
    } catch {
      throw new AnalysisServiceError(
        "Required immutable version is unavailable",
        409,
        "ANALYSIS_VERSION_UNAVAILABLE",
      );
    }

    try {
      const canonicalInput = normaliseAnalysisInput({
        session,
        responses: await this.deps.getResponses(input.assessmentId),
        pack,
        requestedMode: input.requestedMode,
      });
      const inputHash = await hashAnalysisInput(canonicalInput);
      const derivedKey = await deriveAnalysisIdempotencyKey(canonicalInput);
      const idempotencyKey = input.idempotencyKey ?? derivedKey;
      const existing = await this.deps.findRun(idempotencyKey, this.tenant(context));
      if (existing) {
        if (existing.inputHash !== inputHash) {
          throw new AnalysisServiceError(
            "Idempotency key conflicts with existing input",
            409,
            "ANALYSIS_IDEMPOTENCY_CONFLICT",
          );
        }
        await this.deps.appendEvent(existing, "analysis.reused", { status: existing.status });
        return {
          run: existing,
          reused: true,
          httpStatus: existing.status === "completed" ? 200 : 202,
        } as const;
      }

      const now = this.deps.now();
      const digest =
        execution.knowledgePackVersion === DELIVERY_DNA_V2_VERSION
          ? {
              configurationSetId: DELIVERY_DNA_V2_CONFIGURATION_SET_ID,
              configurationVersion: DELIVERY_DNA_V2_VERSION,
              configurationDigest: DELIVERY_DNA_V2_CONFIGURATION_DIGEST,
            }
          : componentDigests();
      const configurationSnapshot =
        execution.knowledgePackVersion === DELIVERY_DNA_V2_VERSION
          ? deliveryDnaV2Catalogue
          : sprint03Configuration;
      const proposed: Omit<AssessmentAnalysisRun, "id" | "createdAt" | "updatedAt"> = {
        assessmentSessionId: session.id,
        runtimeExecutionId: execution.id,
        organisationId: context.organisationId,
        workspaceId: context.workspaceId,
        createdByUserId: context.userId,
        assessmentRevision: canonicalInput.assessment.revision,
        requestedMode: input.requestedMode,
        status: "queued",
        attempt: 0,
        knowledgePackId: canonicalInput.knowledgePack.id,
        knowledgePackVersion: canonicalInput.knowledgePack.version,
        questionSetVersion: canonicalInput.knowledgePack.questionSetVersion,
        configurationSetId: digest.configurationSetId,
        configurationVersion: digest.configurationVersion,
        configurationDigest: digest.configurationDigest,
        configurationSnapshot: structuredClone(configurationSnapshot) as Record<string, unknown>,
        schemaVersion: canonicalInput.schemaVersion,
        engineVersion: canonicalInput.engineVersion,
        inputHash,
        idempotencyKey,
        responseCount: canonicalInput.responses.length,
        input: canonicalInput,
        initiator: { userId: context.userId },
        consentBasis: canonicalInput.assessment.consentBasis,
        correlationId: context.correlationId ?? crypto.randomUUID(),
        errorCode: null,
        safeErrorMessage: null,
        retryable: null,
        queuedAt: now,
        startedAt: null,
        completedAt: null,
        failedAt: null,
      };

      let run: AssessmentAnalysisRun;
      try {
        run = await this.deps.createRun(proposed);
      } catch (error) {
        const raced = await this.deps.findRun(idempotencyKey, this.tenant(context));
        if (!raced) throw error;
        if (raced.inputHash !== inputHash) {
          throw new AnalysisServiceError(
            "Idempotency key conflicts with existing input",
            409,
            "ANALYSIS_IDEMPOTENCY_CONFLICT",
          );
        }
        run = raced;
      }
      await this.deps.appendEvent(run, "analysis.queued", {
        assessmentId: session.id,
        assessmentRevision: run.assessmentRevision,
        configurationSetId: run.configurationSetId,
        inputHash: run.inputHash,
      });
      return { run, reused: false, httpStatus: 202 } as const;
    } catch (error) {
      if (error instanceof AnalysisServiceError) throw error;
      if (error instanceof AnalysisValidationError) {
        throw new AnalysisServiceError(error.message, error.status, error.code);
      }
      throw new AnalysisServiceError(
        "Analysis request failed safely",
        500,
        "ANALYSIS_EXECUTION_FAILED",
      );
    }
  }

  async get(runId: string, context: AnalysisTenantContext) {
    const run = await this.deps.getRun(runId, this.tenant(context));
    if (!run)
      throw new AnalysisServiceError(
        "Analysis resource is not available",
        404,
        "ANALYSIS_ACCESS_DENIED",
      );
    return run;
  }

  async latest(sessionId: string, context: AnalysisTenantContext) {
    await this.requireSession(sessionId, context);
    return this.deps.latestRun(sessionId, this.tenant(context));
  }
}

export const assessmentAnalysisService = new AssessmentAnalysisService();
