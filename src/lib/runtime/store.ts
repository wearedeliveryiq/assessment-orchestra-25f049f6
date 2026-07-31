import type {
  ResponseRecord,
  RuntimeEvent,
  RuntimeEventType,
  RuntimeSession,
  RuntimeSessionStatus,
  AssessmentPublishedPayload,
} from "./types";

/**
 * Persistence boundary for the runtime. The engine depends only on this
 * interface, so the same orchestration runs against Postgres in production and
 * an in-memory store in tests.
 */
export interface RuntimeStore {
  createSession(input: {
    ownerKey: string;
    session: Omit<RuntimeSession, "id">;
  }): Promise<RuntimeSession>;
  getSession(id: string, ownerKey: string): Promise<RuntimeSession | null>;
  listSessions(ownerKey: string): Promise<RuntimeSession[]>;
  updateSession(
    id: string,
    patch: Partial<
      Pick<
        RuntimeSession,
        | "status"
        | "currentSectionId"
        | "currentPageId"
        | "answeredCount"
        | "progress"
        | "locked"
        | "lastSavedAt"
        | "completedAt"
        | "metadata"
      >
    >,
  ): Promise<RuntimeSession>;
  getResponses(sessionId: string): Promise<ResponseRecord[]>;
  upsertResponses(sessionId: string, records: ResponseRecord[]): Promise<void>;
  recordEvent(input: {
    sessionId: string;
    ownerKey: string;
    type: RuntimeEventType;
    payload: Record<string, unknown>;
  }): Promise<RuntimeEvent>;
  listEvents(sessionId: string, limit?: number): Promise<RuntimeEvent[]>;
  savePayload(sessionId: string, payload: AssessmentPublishedPayload): Promise<void>;
  getPayload(sessionId: string): Promise<AssessmentPublishedPayload | null>;
}

/** In-memory store — used by tests and as a local fallback. */
export class InMemoryRuntimeStore implements RuntimeStore {
  private sessions = new Map<string, RuntimeSession & { ownerKey: string }>();
  private responses = new Map<string, Map<string, ResponseRecord>>();
  private events = new Map<string, RuntimeEvent[]>();
  private payloads = new Map<string, AssessmentPublishedPayload>();
  private counter = 0;

  async createSession(input: {
    ownerKey: string;
    session: Omit<RuntimeSession, "id">;
  }): Promise<RuntimeSession> {
    const id = `sess-${++this.counter}`;
    const session = { ...input.session, id, ownerKey: input.ownerKey };
    this.sessions.set(id, session);
    this.responses.set(id, new Map());
    return stripOwner(session);
  }

  async getSession(id: string, ownerKey: string) {
    const session = this.sessions.get(id);
    if (!session || session.ownerKey !== ownerKey) return null;
    return stripOwner(session);
  }

  async listSessions(ownerKey: string) {
    return [...this.sessions.values()]
      .filter((session) => session.ownerKey === ownerKey)
      .map(stripOwner);
  }

  async updateSession(id: string, patch: Partial<RuntimeSession>) {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Session not found");
    Object.assign(session, patch);
    return stripOwner(session);
  }

  async getResponses(sessionId: string) {
    return [...(this.responses.get(sessionId)?.values() ?? [])];
  }

  async upsertResponses(sessionId: string, records: ResponseRecord[]) {
    const bucket = this.responses.get(sessionId) ?? new Map<string, ResponseRecord>();
    for (const record of records) bucket.set(record.questionId, record);
    this.responses.set(sessionId, bucket);
  }

  async recordEvent(input: {
    sessionId: string;
    ownerKey: string;
    type: RuntimeEventType;
    payload: Record<string, unknown>;
  }) {
    const event: RuntimeEvent = {
      id: `evt-${++this.counter}`,
      sessionId: input.sessionId,
      type: input.type,
      payload: input.payload,
      createdAt: new Date().toISOString(),
    };
    this.events.set(input.sessionId, [...(this.events.get(input.sessionId) ?? []), event]);
    return event;
  }

  async listEvents(sessionId: string, limit = 100) {
    return (this.events.get(sessionId) ?? []).slice(-limit).reverse();
  }

  async savePayload(sessionId: string, payload: AssessmentPublishedPayload) {
    this.payloads.set(sessionId, payload);
  }

  async getPayload(sessionId: string) {
    return this.payloads.get(sessionId) ?? null;
  }
}

function stripOwner(session: RuntimeSession & { ownerKey: string }): RuntimeSession {
  const { ownerKey: _ownerKey, ...rest } = session;
  return { ...rest };
}

export type { RuntimeSessionStatus };
