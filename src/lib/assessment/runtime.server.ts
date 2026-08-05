import type {
  AssessmentDetail,
  AssessmentAnswerInput,
  AssessmentResults,
  AssessmentSession,
  EngineStageId,
  RuntimeStatus,
} from "./types";
import { ENGINE_STAGES } from "./stages";
import { ALL_QUESTIONS, TOTAL_QUESTIONS, sectionOf } from "./questionnaire";
import { resolveEngine } from "./engines/registry.server";
import type { EngineContext } from "./engines/contract.server";
import * as repo from "./repository.server";
import {
  engineCompleted,
  engineFailed,
  engineStarted,
  lifecycleEvent,
  scheduleGraphRefresh,
} from "../audit/runtime-audit.server";
import { scheduleAnalysisHandoff } from "../analysis/handoff-service.server";
import {
  DELIVERY_DNA_V2_ASSESSMENT_TYPE,
  assertDeliveryDnaV2ManifestDigest,
  deliveryDnaV2Catalogue,
} from "../delivery-dna/catalogue-v2";
import {
  answeredEvidenceCount,
  deliveryDnaIdentityOf,
  normaliseCustomerAnswer,
  prepareDeliveryDnaCompletion,
  type DeliveryDnaCompletionOptions,
} from "../delivery-dna/submission";
import * as executionRepo from "../orchestrator/repository.server";
import { canUseDeliveryDnaAssessment } from "../delivery-dna/overview-access.server";

export class RuntimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const isDeliveryDnaAssessment = (assessmentType: string) =>
  assessmentType === DELIVERY_DNA_V2_ASSESSMENT_TYPE;

async function requireSession(id: string, ownerKey: string): Promise<AssessmentSession> {
  const session = await repo.getSession(id, ownerKey);
  if (!session) throw new RuntimeError("Assessment not found", 404);
  if (
    isDeliveryDnaAssessment(session.assessmentType) &&
    !(await canUseDeliveryDnaAssessment(id, ownerKey))
  ) {
    const questionSetVersion = (
      session.metadata as { deliveryDna?: { questionSetVersion?: unknown } } | null
    )?.deliveryDna?.questionSetVersion;
    throw new RuntimeError(
      questionSetVersion === "2.0.0"
        ? "Unlock your Delivery DNA Overview to continue with the remaining 30 questions."
        : "Delivery DNA 1.0 has been replaced. Start the Delivery DNA 2.0 Snapshot.",
      403,
    );
  }
  return session;
}

/* ------------------------ lifecycle operations ------------------------ */

export async function createAssessment(input: {
  ownerKey: string;
  organisationId: string;
  workspaceId: string;
  createdByUserId: string;
  organisationName: string;
  contactName?: string | null;
  assessmentType?: string;
}): Promise<AssessmentSession> {
  const name = input.organisationName.trim();
  if (!name) throw new RuntimeError("Organisation name is required", 400);
  const assessmentType = input.assessmentType ?? "delivery-maturity";
  if (isDeliveryDnaAssessment(assessmentType)) {
    throw new RuntimeError(
      "Start with a Delivery DNA Snapshot, save it, then unlock the complete Delivery DNA.",
      403,
    );
  }
  return repo.createSession({ ...input, assessmentType, organisationName: name });
}

export async function listAssessments(
  ownerKey: string,
  tenant?: { organisationId: string; workspaceId: string },
): Promise<AssessmentSession[]> {
  return repo.listSessions(ownerKey, tenant);
}

export async function getAssessment(id: string, ownerKey: string): Promise<AssessmentDetail> {
  const session = await requireSession(id, ownerKey);
  const responses = await repo.getResponses(id);
  return { session, responses };
}

export async function saveProgress(
  id: string,
  ownerKey: string,
  input: {
    answers?: AssessmentAnswerInput[];
    currentSection?: string | null;
    organisationName?: string;
    contactName?: string | null;
  },
): Promise<AssessmentDetail> {
  const session = await requireSession(id, ownerKey);
  if (["submitted", "processing", "completed", "archived"].includes(session.status)) {
    throw new RuntimeError(`An assessment in "${session.status}" cannot be edited`, 409);
  }

  if (isDeliveryDnaAssessment(session.assessmentType)) {
    try {
      deliveryDnaIdentityOf(session);
      const answers = (input.answers ?? []).map(normaliseCustomerAnswer);
      const existing = new Map(
        (await repo.getResponses(id)).map((response) => [response.questionId, response]),
      );
      await repo.upsertResponses(
        id,
        answers.filter((answer) => {
          const stored = existing.get(answer.questionId);
          return (
            !stored ||
            stored.value !== answer.value ||
            stored.evidenceStatus !== answer.evidenceStatus ||
            stored.evidenceReasonCode !== answer.evidenceReasonCode ||
            stored.evidenceReasonText !== answer.evidenceReasonText ||
            stored.notes !== answer.notes
          );
        }),
      );
      const responses = await repo.getResponses(id);
      const recorded = answeredEvidenceCount(responses);
      const updated = await repo.updateSession(id, {
        progress: Math.round((recorded / deliveryDnaV2Catalogue.identity.fullQuestionCount) * 100),
        current_section: input.currentSection ?? session.currentSection,
        status: recorded > 0 ? "in_progress" : "draft",
        ...(input.organisationName ? { organisation_name: input.organisationName.trim() } : {}),
        ...(input.contactName !== undefined ? { contact_name: input.contactName } : {}),
      });
      return { session: updated, responses };
    } catch (error) {
      throw deliveryDnaRuntimeError(error);
    }
  }

  const answers = (input.answers ?? []).filter((answer) =>
    ALL_QUESTIONS.some((question) => question.id === answer.questionId),
  );

  await repo.upsertResponses(
    id,
    answers.map((a) => ({
      questionId: a.questionId,
      sectionId: sectionOf(a.questionId)?.id ?? "unknown",
      value: a.value,
      notes: a.notes ?? null,
    })),
  );

  const responses = await repo.getResponses(id);
  const answered = responses.filter((r) => r.value !== null).length;
  const progress = Math.round((answered / TOTAL_QUESTIONS) * 100);

  const updated = await repo.updateSession(id, {
    progress,
    current_section: input.currentSection ?? session.currentSection,
    status: answered > 0 ? "in_progress" : "draft",
    ...(input.organisationName ? { organisation_name: input.organisationName.trim() } : {}),
    ...(input.contactName !== undefined ? { contact_name: input.contactName } : {}),
  });

  return { session: updated, responses };
}

export async function submitAssessment(
  id: string,
  ownerKey: string,
  options: DeliveryDnaCompletionOptions = {},
): Promise<RuntimeStatus> {
  const session = await requireSession(id, ownerKey);
  if (isDeliveryDnaAssessment(session.assessmentType)) {
    return submitDeliveryDnaAssessment(id, ownerKey, session, options);
  }
  if (session.status === "completed" || session.status === "archived") {
    throw new RuntimeError(`An assessment in "${session.status}" cannot be submitted`, 409);
  }

  const responses = await repo.getResponses(id);
  const answered = responses.filter((r) => r.value !== null).length;
  if (answered < TOTAL_QUESTIONS) {
    throw new RuntimeError(
      `All ${TOTAL_QUESTIONS} questions must be answered before submission (${answered} answered)`,
      400,
    );
  }

  await repo.resetStageRuns(id);
  await repo.updateSession(id, {
    status: "processing",
    progress: 100,
    submitted_at: session.submittedAt ?? new Date().toISOString(),
    failure_reason: null,
    results: null,
    completed_at: null,
  });
  lifecycleEvent(session, ownerKey, "assessment.submitted", { responses: answered });

  return getStatus(id, ownerKey);
}

async function submitDeliveryDnaAssessment(
  id: string,
  ownerKey: string,
  session: AssessmentSession,
  options: DeliveryDnaCompletionOptions,
): Promise<RuntimeStatus> {
  if (session.status === "completed") return getStatus(id, ownerKey);
  if (session.status === "archived") {
    throw new RuntimeError('An assessment in "archived" cannot be submitted', 409);
  }
  try {
    const responses = await repo.getResponses(id);
    const completion = prepareDeliveryDnaCompletion(session, responses, options);
    await assertDeliveryDnaV2ManifestDigest(completion.identity.questionManifestDigest);
    await repo.upsertResponses(id, completion.missingResponses);
    await executionRepo.ensureCompletedCollectionExecution({
      assessmentSessionId: id,
      ownerKey,
      organisationName: session.organisationName,
      assessmentRevision: session.assessmentRevision ?? 1,
      knowledgePackId: completion.identity.knowledgePackId,
      knowledgePackVersion: completion.identity.knowledgePackVersion,
      questionSetId: completion.identity.questionSetId,
      questionSetVersion: completion.identity.questionSetVersion,
      questionManifestDigest: completion.identity.questionManifestDigest,
      configurationSetId: completion.identity.configurationSetId,
    });
    const completedAt = new Date().toISOString();
    const completed = await repo.completeDeliveryDnaSession(id, {
      status: "completed",
      progress: 100,
      current_section: "review",
      submitted_at: session.submittedAt ?? completedAt,
      completed_at: completedAt,
      failure_reason: null,
      results: null,
      metadata: {
        ...session.metadata,
        deliveryDnaEvidence: completion.evidenceMetadata,
      },
    });
    if (!completed.transitioned) return getStatus(id, ownerKey);
    lifecycleEvent(session, ownerKey, "assessment.completed", {
      assessmentType: DELIVERY_DNA_V2_ASSESSMENT_TYPE,
      assessmentRevision: session.assessmentRevision ?? 1,
      missingEvidence: completion.missingCount,
    });
    await scheduleAnalysisHandoff(id, analysisHandoffContext(session, ownerKey));
    return getStatus(id, ownerKey);
  } catch (error) {
    throw deliveryDnaRuntimeError(error);
  }
}

function deliveryDnaRuntimeError(error: unknown): RuntimeError {
  const code = error instanceof Error ? error.message : "DELIVERY_DNA_SUBMISSION_INVALID";
  const messages: Record<string, string> = {
    DELIVERY_DNA_IDENTITY_INVALID:
      "This Delivery DNA assessment version is unavailable. Your responses are safe.",
    DELIVERY_DNA_QUESTION_INVALID: "A response does not belong to this Delivery DNA assessment.",
    DELIVERY_DNA_MANIFEST_INVALID: "The Delivery DNA response set is invalid.",
    DELIVERY_DNA_ANSWER_INVALID: "Choose Emerging, Developing, Established or Leading.",
    DELIVERY_DNA_NOT_APPLICABLE_REASON_REQUIRED:
      "Explain why each not-applicable question does not apply.",
    DELIVERY_DNA_NOT_APPLICABLE_REASON_TOO_LONG:
      "Keep the not-applicable explanation to 500 characters or fewer.",
    DELIVERY_DNA_EXCLUSION_INVALID: "Excluded evidence does not have an approved reason.",
    DELIVERY_DNA_REVIEW_REQUIRED: "Review your answers before completing the assessment.",
    DELIVERY_DNA_MISSING_ACKNOWLEDGEMENT_REQUIRED:
      "Acknowledge the effect of unanswered questions before completing the assessment.",
    DELIVERY_DNA_EVIDENCE_METADATA_REQUIRED:
      "Select how current the evidence is and how many stakeholder groups informed the answers.",
  };
  return new RuntimeError(
    messages[code] ?? "The Delivery DNA assessment could not be completed safely.",
    400,
  );
}

export async function retryProcessing(id: string, ownerKey: string): Promise<RuntimeStatus> {
  const session = await requireSession(id, ownerKey);
  if (session.status !== "processing" && session.status !== "submitted") {
    throw new RuntimeError("Only a processing run can be retried", 409);
  }
  const rows = await repo.getStageRows(id);
  await Promise.all(
    rows
      .filter((row) => row.status === "failed" || row.status === "running")
      .map((row) =>
        repo.updateStageRun(id, row.stage, {
          status: "pending",
          error: null,
          started_at: null,
          completed_at: null,
          duration_ms: null,
        }),
      ),
  );
  await repo.updateSession(id, { status: "processing", failure_reason: null });
  lifecycleEvent(session, ownerKey, "assessment.retried", {
    reset: rows.filter((row) => row.status === "failed" || row.status === "running").length,
  });
  return getStatus(id, ownerKey);
}

export async function archiveAssessment(id: string, ownerKey: string): Promise<AssessmentSession> {
  const session = await requireSession(id, ownerKey);
  const archived = await repo.updateSession(id, {
    status: "archived",
    archived_at: new Date().toISOString(),
  });
  lifecycleEvent(session, ownerKey, "assessment.archived");
  return archived;
}

/* ------------------------ orchestration ------------------------ */

export async function getStatus(id: string, ownerKey: string): Promise<RuntimeStatus> {
  const session = await requireSession(id, ownerKey);
  const rows = await repo.getStageRows(id);
  const stages = rows.map(repo.toStageRun);
  const next = stages.find((s) => s.status === "pending" || s.status === "running") ?? null;
  const failed = stages.some((s) => s.status === "failed");
  return {
    session,
    stages,
    nextStage: failed ? null : (next?.stage ?? null),
    isTerminal:
      session.status === "completed" ||
      session.status === "archived" ||
      failed ||
      (session.status === "processing" && !next),
  };
}

/**
 * Executes exactly one pending engine stage. The controller owns persistence,
 * ordering and failure capture; engines own computation only.
 */
export async function advance(id: string, ownerKey: string): Promise<RuntimeStatus> {
  const session = await requireSession(id, ownerKey);
  if (session.status !== "processing") return getStatus(id, ownerKey);

  const rows = await repo.getStageRows(id);
  const pending = rows.find((row) => row.status === "pending" || row.status === "running");

  if (!pending) {
    const results = assembleResults(rows);
    await repo.updateSession(id, {
      status: "completed",
      results,
      completed_at: new Date().toISOString(),
    });
    await scheduleAnalysisHandoff(id, analysisHandoffContext(session, ownerKey));
    return getStatus(id, ownerKey);
  }

  const startedAt = Date.now();
  await repo.updateStageRun(id, pending.stage, {
    status: "running",
    attempt: pending.attempt + 1,
    started_at: new Date().toISOString(),
    error: null,
  });
  engineStarted(session, ownerKey, pending.stage, pending.attempt + 1);

  try {
    const context: EngineContext = {
      session,
      responses: await repo.getResponses(id),
      artifacts: Object.fromEntries(
        rows.filter((row) => row.status === "completed").map((row) => [row.stage, row.output]),
      ) as EngineContext["artifacts"],
    };

    const output = await resolveEngine(pending.stage).run(context);

    await repo.updateStageRun(id, pending.stage, {
      status: "completed",
      output: output ?? null,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });
    engineCompleted(session, ownerKey, pending.stage, Date.now() - startedAt, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown engine failure";
    await repo.updateStageRun(id, pending.stage, {
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });
    await repo.updateSession(id, { failure_reason: `${pending.stage}: ${message}` });
    engineFailed(session, ownerKey, pending.stage, Date.now() - startedAt, error);
    return getStatus(id, ownerKey);
  }

  const after = await repo.getStageRows(id);
  if (after.every((row) => row.status === "completed")) {
    await repo.updateSession(id, {
      status: "completed",
      results: assembleResults(after),
      completed_at: new Date().toISOString(),
    });
    lifecycleEvent(session, ownerKey, "assessment.completed", {
      stages: after.length,
    });
    await scheduleAnalysisHandoff(id, analysisHandoffContext(session, ownerKey));
    scheduleGraphRefresh(id);
  }

  return getStatus(id, ownerKey);
}

export async function getResults(id: string, ownerKey: string): Promise<AssessmentResults> {
  await requireSession(id, ownerKey);
  const results = await repo.getSessionResults(id, ownerKey);
  if (!results) throw new RuntimeError("Results are not available yet", 409);
  return results;
}

function outputOf<T>(rows: { stage: EngineStageId; output: unknown }[], stage: EngineStageId): T {
  return rows.find((row) => row.stage === stage)?.output as T;
}

function assembleResults(rows: { stage: EngineStageId; output: unknown }[]): AssessmentResults {
  return {
    generatedAt: new Date().toISOString(),
    observations: outputOf(rows, "observations") ?? [],
    signals: outputOf(rows, "signals") ?? [],
    rules: outputOf(rows, "rules") ?? [],
    patterns: outputOf(rows, "patterns") ?? [],
    scores: outputOf(rows, "scores") ?? { overall: 0, band: "at-risk", sections: [] },
    recommendations: outputOf(rows, "recommendations") ?? [],
    narrative: outputOf(rows, "narrative") ?? { headline: "", summary: "", paragraphs: [] },
  } as AssessmentResults;
}

export const STAGE_COUNT = ENGINE_STAGES.length;

function analysisHandoffContext(session: AssessmentSession, ownerKey: string) {
  return {
    ownerKey,
    organisationId: session.organisationId,
    workspaceId: session.workspaceId,
    userId: session.createdByUserId,
  };
}
