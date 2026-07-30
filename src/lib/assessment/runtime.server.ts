import type {
  AssessmentDetail,
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

export class RuntimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requireSession(id: string, ownerKey: string): Promise<AssessmentSession> {
  const session = await repo.getSession(id, ownerKey);
  if (!session) throw new RuntimeError("Assessment not found", 404);
  return session;
}

/* ------------------------ lifecycle operations ------------------------ */

export async function createAssessment(input: {
  ownerKey: string;
  organisationName: string;
  contactName?: string | null;
  assessmentType?: string;
}): Promise<AssessmentSession> {
  const name = input.organisationName.trim();
  if (!name) throw new RuntimeError("Organisation name is required", 400);
  return repo.createSession({ ...input, organisationName: name });
}

export async function listAssessments(ownerKey: string): Promise<AssessmentSession[]> {
  return repo.listSessions(ownerKey);
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
    answers?: { questionId: string; value: number | string | null; notes?: string | null }[];
    currentSection?: string | null;
    organisationName?: string;
    contactName?: string | null;
  },
): Promise<AssessmentDetail> {
  const session = await requireSession(id, ownerKey);
  if (["submitted", "processing", "completed", "archived"].includes(session.status)) {
    throw new RuntimeError(`An assessment in "${session.status}" cannot be edited`, 409);
  }

  const answers = (input.answers ?? []).filter((a) =>
    ALL_QUESTIONS.some((q) => q.id === a.questionId),
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

export async function submitAssessment(id: string, ownerKey: string): Promise<RuntimeStatus> {
  const session = await requireSession(id, ownerKey);
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
