import { allQuestions, findQuestion } from "./definition";
import { resolveNavigation, resolveTarget, sectionOfPage, visiblePages } from "./navigation";
import { computeProgress, toResponseMap } from "./progress";
import { isAnswered, isVisible, validateAssessment, validateSingle } from "./validation";
import type { RuntimeStore } from "./store";
import type {
  AssessmentDefinition,
  AssessmentPublishedPayload,
  AssessmentSummary,
  ResponseRecord,
  ResponseValue,
  RuntimeEvent,
  RuntimeEventType,
  RuntimeSession,
  RuntimeSnapshot,
  ValidationOutcome,
} from "./types";
import type { NavigationCommand } from "./navigation";

export class RuntimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "RuntimeError";
  }
}

/* --------------------------------- event bus -------------------------------- */

type RuntimeSubscriber = (event: RuntimeEvent) => void | Promise<void>;

const subscribers = new Set<RuntimeSubscriber>();

/** Sprint 2 services subscribe here; failures never break the runtime. */
export function subscribeToRuntimeEvents(subscriber: RuntimeSubscriber): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export interface RuntimeEngineOptions {
  store: RuntimeStore;
  loadDefinition: (packId?: string, version?: string) => AssessmentDefinition;
  now?: () => Date;
}

/**
 * AssessmentRuntimeService — the generic execution engine.
 *
 * Combines the capture, validation, navigation, progress, completion and audit
 * responsibilities behind one transactional façade while delegating each concern
 * to its own single-responsibility module.
 */
export class AssessmentRuntimeEngine {
  constructor(private readonly options: RuntimeEngineOptions) {}

  private get store() {
    return this.options.store;
  }

  private now() {
    return (this.options.now?.() ?? new Date()).toISOString();
  }

  /* ------------------------------ audit / events ----------------------------- */

  private async publish(
    session: RuntimeSession,
    ownerKey: string,
    type: RuntimeEventType,
    payload: Record<string, unknown> = {},
  ) {
    let event: RuntimeEvent;
    try {
      event = await this.store.recordEvent({
        sessionId: session.id,
        ownerKey,
        type,
        payload,
      });
    } catch (error) {
      console.error("[runtime-audit] failed to persist event", type, error);
      return;
    }
    for (const subscriber of subscribers) {
      void Promise.resolve()
        .then(() => subscriber(event))
        .catch((error) => console.error("[runtime-events] subscriber failed", error));
    }
  }

  /* --------------------------------- loading --------------------------------- */

  private definitionFor(session: RuntimeSession): AssessmentDefinition {
    try {
      return this.options.loadDefinition(session.packId, session.packVersion);
    } catch (error) {
      throw new RuntimeError(
        `The assessment definition for "${session.packId}" could not be loaded.`,
        503,
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async require(id: string, ownerKey: string): Promise<RuntimeSession> {
    if (!id || id === "undefined") throw new RuntimeError("Invalid assessment id", 400);
    const session = await this.store.getSession(id, ownerKey);
    if (!session) throw new RuntimeError("Assessment session not found", 404);
    return session;
  }

  /* -------------------------------- lifecycle -------------------------------- */

  async start(input: {
    ownerKey: string;
    packId?: string;
    packVersion?: string;
    metadata?: Record<string, unknown>;
  }): Promise<RuntimeSnapshot> {
    let definition: AssessmentDefinition;
    try {
      definition = this.options.loadDefinition(input.packId, input.packVersion);
    } catch (error) {
      throw new RuntimeError(
        `No executable assessment definition was found${input.packId ? ` for "${input.packId}"` : ""}.`,
        404,
        error instanceof Error ? error.message : error,
      );
    }

    const firstSection = definition.sections[0];
    const firstPage = firstSection?.pages[0];
    const startedAt = this.now();

    const session = await this.store.createSession({
      ownerKey: input.ownerKey,
      session: {
        packId: definition.packId,
        packVersion: definition.packVersion,
        assessmentId: definition.assessmentId,
        name: definition.name,
        status: "created",
        currentSectionId: firstSection?.id ?? null,
        currentPageId: firstPage?.id ?? null,
        answeredCount: 0,
        totalQuestions: definition.questionCount,
        progress: 0,
        locked: false,
        startedAt,
        lastSavedAt: null,
        completedAt: null,
        metadata: input.metadata ?? {},
      },
    });

    await this.publish(session, input.ownerKey, "assessment.started", {
      packId: definition.packId,
      packVersion: definition.packVersion,
      questions: definition.questionCount,
    });

    return this.snapshot(session, definition);
  }

  async get(id: string, ownerKey: string): Promise<RuntimeSnapshot> {
    const session = await this.require(id, ownerKey);
    return this.snapshot(session, this.definitionFor(session));
  }

  async list(ownerKey: string): Promise<RuntimeSession[]> {
    return this.store.listSessions(ownerKey);
  }

  async progress(id: string, ownerKey: string) {
    const session = await this.require(id, ownerKey);
    const definition = this.definitionFor(session);
    const responses = toResponseMap(await this.store.getResponses(id));
    return computeProgress(definition, responses, session.currentSectionId);
  }

  /* ------------------------------ capture / save ----------------------------- */

  /** ResponseCaptureService — validates then persists a single answer. */
  async answer(
    id: string,
    ownerKey: string,
    input: { questionId: string; value: ResponseValue },
  ): Promise<{ snapshot: RuntimeSnapshot; validation: ValidationOutcome }> {
    const session = await this.assertEditable(id, ownerKey);
    const definition = this.definitionFor(session);
    const entry = findQuestion(definition, input.questionId);
    if (!entry) throw new RuntimeError(`Unknown question "${input.questionId}"`, 400);

    const validation = validateSingle(definition, input.questionId, input.value);
    if (!validation.valid) {
      await this.publish(session, ownerKey, "assessment.validation_failed", {
        questionId: input.questionId,
        issues: validation.issues,
      });
    }

    await this.store.upsertResponses(id, [
      {
        questionId: entry.question.id,
        sectionId: entry.sectionId,
        pageId: entry.pageId,
        value: input.value,
        valid: validation.valid,
        updatedAt: this.now(),
      },
    ]);

    const updated = await this.recalculate(id, ownerKey, session, definition, {
      status: session.status === "created" ? "in_progress" : session.status,
    });

    await this.publish(updated, ownerKey, "assessment.question_answered", {
      questionId: input.questionId,
      sectionId: entry.sectionId,
      valid: validation.valid,
    });

    await this.emitSectionCompleted(updated, ownerKey, definition, entry.sectionId);

    return { snapshot: await this.snapshot(updated, definition), validation };
  }

  /** Batch save — used by auto-save, page navigation and unload beacons. */
  async save(
    id: string,
    ownerKey: string,
    input: {
      answers?: { questionId: string; value: ResponseValue }[];
      currentPageId?: string | null;
    },
  ): Promise<RuntimeSnapshot> {
    const session = await this.assertEditable(id, ownerKey);
    const definition = this.definitionFor(session);

    const records: ResponseRecord[] = [];
    for (const answer of input.answers ?? []) {
      const entry = findQuestion(definition, answer.questionId);
      if (!entry) continue;
      records.push({
        questionId: entry.question.id,
        sectionId: entry.sectionId,
        pageId: entry.pageId,
        value: answer.value,
        valid: validateSingle(definition, answer.questionId, answer.value).valid,
        updatedAt: this.now(),
      });
    }
    if (records.length > 0) await this.store.upsertResponses(id, records);

    const pageId = input.currentPageId ?? session.currentPageId;
    const updated = await this.recalculate(id, ownerKey, session, definition, {
      status: session.status === "created" && records.length > 0 ? "in_progress" : session.status,
      currentPageId: pageId,
      currentSectionId: pageId ? sectionOfPage(definition, pageId) : session.currentSectionId,
      lastSavedAt: this.now(),
    });

    await this.publish(updated, ownerKey, "assessment.saved", { answers: records.length });
    return this.snapshot(updated, definition);
  }

  /* -------------------------------- navigation ------------------------------- */

  async navigate(
    id: string,
    ownerKey: string,
    command: NavigationCommand,
    answers?: { questionId: string; value: ResponseValue }[],
  ): Promise<RuntimeSnapshot> {
    const session = await this.assertEditable(id, ownerKey);
    if (answers?.length) await this.save(id, ownerKey, { answers });

    const definition = this.definitionFor(session);
    const current = await this.store.getSession(id, ownerKey);
    if (!current) throw new RuntimeError("Assessment session not found", 404);
    const responses = toResponseMap(await this.store.getResponses(id));

    const target = resolveTarget(definition, current, responses, command);
    if (!target) throw new RuntimeError("That navigation step is not available", 409);

    const updated = await this.store.updateSession(id, {
      currentPageId: target,
      currentSectionId: sectionOfPage(definition, target),
      lastSavedAt: this.now(),
    });
    return this.snapshot(updated, definition);
  }

  /* ------------------------------ pause / resume ----------------------------- */

  async pause(id: string, ownerKey: string): Promise<RuntimeSnapshot> {
    const session = await this.assertEditable(id, ownerKey);
    const updated = await this.store.updateSession(id, {
      status: "paused",
      lastSavedAt: this.now(),
    });
    await this.publish(updated, ownerKey, "assessment.paused", {
      progress: session.progress,
    });
    return this.snapshot(updated, this.definitionFor(updated));
  }

  async resume(id: string, ownerKey: string): Promise<RuntimeSnapshot> {
    const session = await this.require(id, ownerKey);
    if (session.status === "completed") {
      throw new RuntimeError("A completed assessment cannot be resumed", 409);
    }
    const definition = this.definitionFor(session);
    if (!definition.navigation.allowResume) {
      throw new RuntimeError("This assessment does not allow resuming", 403);
    }
    const updated = await this.store.updateSession(id, { status: "in_progress" });
    await this.publish(updated, ownerKey, "assessment.resumed", {
      progress: updated.progress,
    });
    return this.snapshot(updated, definition);
  }

  /* -------------------------------- completion ------------------------------- */

  /** AssessmentCompletionService — locks, timestamps and publishes the payload. */
  async complete(id: string, ownerKey: string): Promise<AssessmentSummary> {
    const session = await this.require(id, ownerKey);
    if (session.status === "completed") return this.summary(id, ownerKey);

    const definition = this.definitionFor(session);
    const records = await this.store.getResponses(id);
    const responses = toResponseMap(records);

    if (definition.navigation.requireCompleteToFinish) {
      const outcome = validateAssessment(definition, responses);
      if (!outcome.valid) {
        await this.publish(session, ownerKey, "assessment.validation_failed", {
          issues: outcome.issues.slice(0, 25),
          total: outcome.issues.length,
        });
        throw new RuntimeError(
          `${outcome.issues.length} question(s) still need a valid answer`,
          400,
          outcome.issues.slice(0, 50),
        );
      }
    }

    const completedAt = this.now();
    const payload: AssessmentPublishedPayload = {
      sessionId: session.id,
      packId: session.packId,
      packVersion: session.packVersion,
      assessmentId: session.assessmentId,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(session.startedAt).getTime(),
      responses: allQuestions(definition)
        .filter(({ question }) => isVisible(question, responses))
        .map(({ question, sectionId }) => ({
          questionId: question.id,
          sectionId,
          code: question.code,
          type: question.type,
          value: responses[question.id] ?? null,
        })),
    };

    await this.store.savePayload(id, payload);
    const updated = await this.store.updateSession(id, {
      status: "completed",
      locked: true,
      completedAt,
      progress: 100,
      lastSavedAt: completedAt,
    });
    await this.publish(updated, ownerKey, "assessment.completed", {
      durationMs: payload.durationMs,
      responses: payload.responses.length,
    });

    return this.summary(id, ownerKey);
  }

  async summary(id: string, ownerKey: string): Promise<AssessmentSummary> {
    const session = await this.require(id, ownerKey);
    const definition = this.definitionFor(session);
    const responses = toResponseMap(await this.store.getResponses(id));
    return {
      session,
      progress: computeProgress(definition, responses, session.currentSectionId),
      payload: await this.store.getPayload(id),
      events: await this.store.listEvents(id, 50),
    };
  }

  /* --------------------------------- helpers --------------------------------- */

  private async assertEditable(id: string, ownerKey: string): Promise<RuntimeSession> {
    const session = await this.require(id, ownerKey);
    if (session.locked || session.status === "completed") {
      throw new RuntimeError("This assessment is locked and can no longer be edited", 409);
    }
    if (session.status === "abandoned") {
      throw new RuntimeError("This assessment session has expired", 410);
    }
    return session;
  }

  private async recalculate(
    id: string,
    _ownerKey: string,
    session: RuntimeSession,
    definition: AssessmentDefinition,
    patch: Partial<RuntimeSession>,
  ): Promise<RuntimeSession> {
    const responses = toResponseMap(await this.store.getResponses(id));
    const snapshot = computeProgress(definition, responses, session.currentSectionId);
    return this.store.updateSession(id, {
      ...patch,
      answeredCount: snapshot.questionsAnswered,
      progress: snapshot.percentComplete,
    });
  }

  private async emitSectionCompleted(
    session: RuntimeSession,
    ownerKey: string,
    definition: AssessmentDefinition,
    sectionId: string,
  ) {
    const responses = toResponseMap(await this.store.getResponses(session.id));
    const section = definition.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const questions = section.pages
      .flatMap((page) => page.questions)
      .filter((question) => isVisible(question, responses));
    if (
      questions.length > 0 &&
      questions.every((question) => isAnswered(responses[question.id] ?? null))
    ) {
      await this.publish(session, ownerKey, "assessment.section_completed", {
        sectionId,
        questions: questions.length,
      });
    }
  }

  private async snapshot(
    session: RuntimeSession,
    definition: AssessmentDefinition,
  ): Promise<RuntimeSnapshot> {
    const records = await this.store.getResponses(session.id);
    const responses = toResponseMap(records);
    // Guarantee the session always points at a page that is actually visible.
    if (!session.currentPageId) {
      session = {
        ...session,
        currentPageId: visiblePages(definition, responses)[0]?.page.id ?? null,
      };
    }
    return {
      session,
      definition,
      responses: records,
      progress: computeProgress(definition, responses, session.currentSectionId),
      navigation: resolveNavigation(definition, session, responses),
    };
  }
}
