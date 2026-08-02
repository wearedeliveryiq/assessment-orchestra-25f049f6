import { describe, expect, it, vi } from "vitest";

import type { AssessmentSession } from "@/lib/assessment/types";
import { normaliseAnalysisInput } from "@/lib/analysis/normalizer";
import {
  AssessmentAnalysisService,
  type AnalysisDependencies,
} from "@/lib/analysis/service.server";
import type { AssessmentAnalysisRun, AnalysisEventType } from "@/lib/analysis/types";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";
import type { Execution } from "@/lib/orchestrator/types";

const session: AssessmentSession = {
  id: "11111111-1111-4111-8111-111111111111",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  createdByUserId: "44444444-4444-4444-8444-444444444444",
  organisationName: "DeliveryIQ Test",
  contactName: null,
  assessmentType: "executive-sponsorship",
  status: "completed",
  currentSection: null,
  progress: 100,
  metadata: {},
  failureReason: null,
  submittedAt: "2026-08-02T00:00:00.000Z",
  completedAt: "2026-08-02T00:01:00.000Z",
  createdAt: "2026-08-01T23:55:00.000Z",
  updatedAt: "2026-08-02T00:01:00.000Z",
};

const pack = {
  manifest: { id: "executive-sponsorship", version: "1.4.0" },
  questions: {
    questions: [
      { id: "q-b", sectionId: "s-2" },
      { id: "q-a", sectionId: "s-1" },
    ],
  },
} as KnowledgePackDocument;

const responses = [
  {
    questionId: "q-b",
    sectionId: "s-2",
    value: 4,
    score: 4,
    notes: "excluded",
    answeredAt: "later",
  },
  { questionId: "q-a", sectionId: "s-1", value: 2, score: 2, notes: null, answeredAt: "earlier" },
];

const execution = {
  id: "55555555-5555-4555-8555-555555555555",
  knowledgePackId: "executive-sponsorship",
  knowledgePackVersion: "1.4.0",
} as Execution;

const context = {
  ownerKey: `${session.createdByUserId}:${session.workspaceId}`,
  organisationId: session.organisationId,
  workspaceId: session.workspaceId,
  userId: session.createdByUserId,
};

function harness(overrides: Partial<AnalysisDependencies> = {}) {
  const stored: AssessmentAnalysisRun[] = [];
  const events: AnalysisEventType[] = [];
  const deps: AnalysisDependencies = {
    getSession: vi.fn(async () => session),
    getResponses: vi.fn(async () => responses),
    findCompletedExecution: vi.fn(async () => execution),
    loadPack: vi.fn(() => pack),
    findRun: vi.fn(async (key) => stored.find((run) => run.idempotencyKey === key) ?? null),
    latestRun: vi.fn(async () => stored.at(-1) ?? null),
    createRun: vi.fn(async (input) => {
      const run = { ...input, id: `run-${stored.length + 1}`, createdAt: input.completedAt };
      stored.push(run);
      return run;
    }),
    publish: vi.fn((_session, _owner, type) => events.push(type)),
    now: () => "2026-08-02T00:02:00.000Z",
    ...overrides,
  };
  return { service: new AssessmentAnalysisService(deps), deps, stored, events };
}

describe("S3-001 assessment analysis", () => {
  it("normalises responses into a stable Knowledge Pack order without volatile fields", () => {
    const input = normaliseAnalysisInput({ session, responses, pack });
    expect(input.responses.map((response) => response.questionId)).toEqual(["q-a", "q-b"]);
    expect(input.responses[0]).toEqual({ questionId: "q-a", sectionId: "s-1", value: 2, score: 2 });
    expect(JSON.stringify(input)).not.toContain("notes");
    expect(JSON.stringify(input)).not.toContain("answeredAt");
  });

  it("persists one immutable canonical run and emits structured lifecycle events", async () => {
    const { service, stored, events } = harness();
    const run = await service.analyse(session.id, context);
    expect(run.knowledgePackVersion).toBe("1.4.0");
    expect(run.responseCount).toBe(2);
    expect(run.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).toHaveLength(1);
    expect(events).toEqual(["analysis.started", "analysis.completed"]);
  });

  it("is idempotent for an identical completed session", async () => {
    const { service, deps, stored, events } = harness();
    const first = await service.analyse(session.id, context);
    const second = await service.analyse(session.id, context);
    expect(second.id).toBe(first.id);
    expect(stored).toHaveLength(1);
    expect(deps.createRun).toHaveBeenCalledTimes(1);
    expect(events).toContain("analysis.reused");
  });

  it("rejects an incomplete response set and records failure", async () => {
    const { service, events } = harness({ getResponses: vi.fn(async () => responses.slice(0, 1)) });
    await expect(service.analyse(session.id, context)).rejects.toMatchObject({
      code: "assessment_incomplete",
      status: 422,
    });
    expect(events.at(-1)).toBe("analysis.failed");
  });

  it("rejects a non-completed session", async () => {
    const { service } = harness({
      getSession: vi.fn(async () => ({ ...session, status: "processing", completedAt: null })),
    });
    await expect(service.analyse(session.id, context)).rejects.toMatchObject({
      code: "assessment_not_completed",
      status: 409,
    });
  });

  it("fails closed when the pinned Knowledge Pack version cannot be loaded", async () => {
    const { service } = harness({
      loadPack: vi.fn(() => {
        throw new Error("missing version");
      }),
    });
    await expect(service.analyse(session.id, context)).rejects.toMatchObject({
      code: "knowledge_pack_invalid",
      status: 422,
    });
  });

  it("requires a completed version-pinned runtime execution", async () => {
    const { service, events } = harness({ findCompletedExecution: vi.fn(async () => null) });
    await expect(service.analyse(session.id, context)).rejects.toMatchObject({
      code: "completed_execution_required",
      status: 409,
    });
    expect(events.at(-1)).toBe("analysis.failed");
  });

  it("does not reveal a session from another workspace", async () => {
    const { service, deps } = harness();
    await expect(
      service.analyse(session.id, {
        ...context,
        workspaceId: "99999999-9999-4999-8999-999999999999",
      }),
    ).rejects.toMatchObject({ code: "tenant_mismatch", status: 404 });
    expect(deps.getResponses).not.toHaveBeenCalled();
  });
});
