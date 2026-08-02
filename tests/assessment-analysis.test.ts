import { describe, expect, it, vi } from "vitest";

import type { AssessmentSession } from "@/lib/assessment/types";
import { deriveAnalysisIdempotencyKey, normaliseAnalysisInput } from "@/lib/analysis/normalizer";
import {
  AssessmentAnalysisService,
  type AnalysisDependencies,
} from "@/lib/analysis/service.server";
import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";
import type { Execution } from "@/lib/orchestrator/types";

const session: AssessmentSession = {
  id: "11111111-1111-4111-8111-111111111111",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  createdByUserId: "44444444-4444-4444-8444-444444444444",
  organisationName: "DeliveryIQ Test",
  contactName: null,
  assessmentType: "delivery-dna",
  status: "completed",
  currentSection: null,
  progress: 100,
  metadata: {},
  failureReason: null,
  submittedAt: "2026-08-02T00:00:00.000Z",
  completedAt: "2026-08-02T00:01:00.000Z",
  createdAt: "2026-08-01T23:55:00.000Z",
  updatedAt: "2026-08-02T00:01:00.000Z",
  assessmentRevision: 3,
  consentBasis: "authenticated_assessment_submission",
};
const pack = {
  manifest: { id: "delivery-dna", version: "1.0.0" },
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
    notes: null,
    answeredAt: "2026-08-02T00:00:02Z",
    evidenceStatus: "answered" as const,
    respondentGroupId: "delivery",
    evidenceAt: "2026-08-01T00:00:00Z",
  },
  {
    questionId: "q-a",
    sectionId: "s-1",
    value: 2,
    score: 2,
    notes: null,
    answeredAt: "2026-08-02T00:00:01Z",
    evidenceStatus: "answered" as const,
    respondentGroupId: "leadership",
    evidenceAt: "2026-08-01T00:00:00Z",
  },
];
const execution = {
  id: "55555555-5555-4555-8555-555555555555",
  knowledgePackId: "delivery-dna",
  knowledgePackVersion: "1.0.0",
} as Execution;
const context = {
  ownerKey: "owner",
  organisationId: session.organisationId,
  workspaceId: session.workspaceId,
  userId: session.createdByUserId,
  correlationId: "corr-1",
};

function harness(overrides: Partial<AnalysisDependencies> = {}) {
  const stored: AssessmentAnalysisRun[] = [];
  const events: string[] = [];
  const deps: AnalysisDependencies = {
    getSession: vi.fn(async () => session),
    getResponses: vi.fn(async () => responses),
    findCompletedExecution: vi.fn(async () => execution),
    loadPack: vi.fn(() => pack),
    findRun: vi.fn(async (key) => stored.find((run) => run.idempotencyKey === key) ?? null),
    getRun: vi.fn(async (id) => stored.find((run) => run.id === id) ?? null),
    latestRun: vi.fn(async () => stored.at(-1) ?? null),
    createRun: vi.fn(async (input) => {
      const run = {
        ...input,
        id: `run-${stored.length + 1}`,
        createdAt: input.queuedAt,
        updatedAt: input.queuedAt,
      };
      stored.push(run);
      return run;
    }),
    appendEvent: vi.fn(async (_run, type) => {
      events.push(type);
    }),
    now: () => "2026-08-02T00:02:00.000Z",
    ...overrides,
  };
  return { service: new AssessmentAnalysisService(deps), deps, stored, events };
}

describe("S3-001 assessment analysis pipeline", () => {
  it("retains stable answer, question, respondent and evidence references", () => {
    const input = normaliseAnalysisInput({ session, responses, pack, requestedMode: "workspace" });
    expect(input.responses.map((item) => item.questionId)).toEqual(["q-a", "q-b"]);
    expect(input.responses[0]).toMatchObject({
      answerId: `${session.id}:q-a`,
      answerVersion: responses[1].answeredAt,
      questionVersion: "1.0.0",
      respondentGroupId: "leadership",
      evidenceAt: "2026-08-01T00:00:00Z",
    });
  });

  it("preserves explicit missing, not-applicable and excluded evidence semantics", () => {
    for (const status of ["missing", "not_applicable", "excluded"] as const) {
      const canonical = normaliseAnalysisInput({
        session,
        pack,
        responses: responses.map((response, index) =>
          index === 0
            ? { ...response, value: null, score: null, evidenceStatus: status }
            : response,
        ),
      });
      expect(
        canonical.responses.find((item) => item.questionId === responses[0].questionId),
      ).toMatchObject({
        status,
        value: null,
      });
    }
  });

  it("creates one queued immutable snapshot and emits a correlated event", async () => {
    const { service, stored, events } = harness();
    const result = await service.request(
      { assessmentId: session.id, requestedMode: "workspace" },
      context,
    );
    expect(result.httpStatus).toBe(202);
    expect(result.run.status).toBe("queued");
    expect(result.run.configurationSetId).toBe("sprint03-product-config-1.0.0");
    expect(result.run.configurationDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(result.run.correlationId).toBe("corr-1");
    expect(stored).toHaveLength(1);
    expect(events).toEqual(["analysis.queued"]);
  });

  it("derives the locked idempotency material and replays without duplication", async () => {
    const canonical = normaliseAnalysisInput({
      session,
      responses,
      pack,
      requestedMode: "workspace",
    });
    await expect(deriveAnalysisIdempotencyKey(canonical)).resolves.toMatch(/^[0-9a-f]{64}$/);
    const { service, stored } = harness();
    const first = await service.request(
      { assessmentId: session.id, requestedMode: "workspace" },
      context,
    );
    const replay = await service.request(
      { assessmentId: session.id, requestedMode: "workspace" },
      context,
    );
    expect(replay.run.id).toBe(first.run.id);
    expect(replay.reused).toBe(true);
    expect(stored).toHaveLength(1);
  });

  it("returns a stable conflict for same-key different canonical input", async () => {
    const { service } = harness();
    await service.request(
      { assessmentId: session.id, requestedMode: "workspace", idempotencyKey: "customer-key-0001" },
      context,
    );
    session.assessmentRevision = 4;
    await expect(
      service.request(
        {
          assessmentId: session.id,
          requestedMode: "workspace",
          idempotencyKey: "customer-key-0001",
        },
        context,
      ),
    ).rejects.toMatchObject({ code: "ANALYSIS_IDEMPOTENCY_CONFLICT", status: 409 });
    session.assessmentRevision = 3;
  });

  it("fails closed for incomplete, unavailable-version and cross-tenant input", async () => {
    const incomplete = harness({ getResponses: vi.fn(async () => responses.slice(0, 1)) });
    await expect(
      incomplete.service.request({ assessmentId: session.id, requestedMode: "workspace" }, context),
    ).rejects.toMatchObject({ code: "ANALYSIS_INPUT_INCOMPLETE", status: 422 });
    const unavailable = harness({ findCompletedExecution: vi.fn(async () => null) });
    await expect(
      unavailable.service.request(
        { assessmentId: session.id, requestedMode: "workspace" },
        context,
      ),
    ).rejects.toMatchObject({ code: "ANALYSIS_VERSION_UNAVAILABLE", status: 409 });
    const mismatch = harness();
    await expect(
      mismatch.service.request(
        { assessmentId: session.id, requestedMode: "workspace" },
        { ...context, workspaceId: "99999999-9999-4999-8999-999999999999" },
      ),
    ).rejects.toMatchObject({ code: "ANALYSIS_ACCESS_DENIED", status: 404 });
  });
});
