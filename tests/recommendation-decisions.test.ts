import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  availableRecommendationDecisionCommands,
  recommendationDecisionReasonCategories,
  transitionRecommendationDecision,
  type RecommendationDecisionCommand,
  type RecommendationDecisionState,
} from "@/lib/recommendation-decisions/model";
import { projectRecommendationDecision } from "@/lib/recommendation-decisions/projection";
import {
  RecommendationDecisionService,
  RecommendationDecisionServiceError,
  type RecommendationDecisionRepository,
} from "@/lib/recommendation-decisions/service.server";
import type {
  RecommendationDecisionEventRecord,
  RecommendationDecisionPortfolioItem,
  RecommendationDecisionRecord,
} from "@/lib/recommendation-decisions/types";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};
const source: RecommendationDecisionPortfolioItem = {
  id: "11111111-1111-4111-8111-111111111111",
  portfolioId: "44444444-4444-4444-8444-444444444444",
  analysisRunId: "55555555-5555-4555-8555-555555555555",
  recommendationId: "rec_decision_rights",
  recommendationVersion: "1.0.0",
  ...tenant,
  portfolioPolicyVersion: "PB-004/S4-007/1.0.0",
  catalogueVersionId: "66666666-6666-4666-8666-666666666666",
  catalogueDigest: "c".repeat(64),
};

function record(
  currentState: RecommendationDecisionState = "undecided",
  version = 0,
  history: RecommendationDecisionEventRecord[] = [],
): RecommendationDecisionRecord {
  return {
    id: version ? "77777777-7777-4777-8777-777777777777" : null,
    ...source,
    currentState,
    version,
    reasonCategory: null,
    reviewAt: null,
    acknowledged: currentState === "accepted",
    lastActorType: version ? "user" : null,
    lastActorUserId: version ? "88888888-8888-4888-8888-888888888888" : null,
    updatedAt: version ? "2026-08-03T09:00:00.000Z" : null,
    history,
  };
}

const fieldsByCommand = {
  accepted: { acknowledged: true, reasonCategory: null, reviewAt: null },
  deferred: {
    acknowledged: false,
    reasonCategory: "wrong_timing" as const,
    reviewAt: "2026-09-01T09:00:00.000Z",
  },
  rejected: {
    acknowledged: false,
    reasonCategory: "not_relevant" as const,
    reviewAt: null,
  },
  restored: { acknowledged: false, reasonCategory: null, reviewAt: null },
};

const legalTransitions: Array<
  [
    RecommendationDecisionState,
    Exclude<RecommendationDecisionCommand, "superseded">,
    RecommendationDecisionState,
  ]
> = [
  ["undecided", "accepted", "accepted"],
  ["deferred", "accepted", "accepted"],
  ["rejected", "accepted", "accepted"],
  ["undecided", "deferred", "deferred"],
  ["accepted", "deferred", "deferred"],
  ["rejected", "deferred", "deferred"],
  ["undecided", "rejected", "rejected"],
  ["accepted", "rejected", "rejected"],
  ["deferred", "rejected", "rejected"],
  ["deferred", "restored", "undecided"],
  ["rejected", "restored", "undecided"],
];

describe("S4-008 customer decision transition model", () => {
  it.each(legalTransitions)("allows %s → %s → %s", (currentState, command, expected) => {
    expect(
      transitionRecommendationDecision({ currentState, command, ...fieldsByCommand[command] }),
    ).toMatchObject({ previousState: currentState, command, currentState: expected });
  });

  it("rejects every user transition outside the locked matrix", () => {
    const legal = new Set(legalTransitions.map(([state, command]) => `${state}:${command}`));
    for (const state of ["undecided", "accepted", "deferred", "rejected", "superseded"] as const) {
      for (const command of ["accepted", "deferred", "rejected", "restored"] as const) {
        if (!legal.has(`${state}:${command}`)) {
          expect(() =>
            transitionRecommendationDecision({
              currentState: state,
              command,
              ...fieldsByCommand[command],
            }),
          ).toThrow("no longer available");
        }
      }
    }
  });

  it("requires acknowledgement, review date and a locked reject category", () => {
    expect(() =>
      transitionRecommendationDecision({
        currentState: "undecided",
        command: "accepted",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
      }),
    ).toThrow("requires acknowledgement");
    expect(() =>
      transitionRecommendationDecision({
        currentState: "undecided",
        command: "deferred",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
      }),
    ).toThrow("valid review date");
    expect(() =>
      transitionRecommendationDecision({
        currentState: "undecided",
        command: "rejected",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
      }),
    ).toThrow("approved reason category");
    expect(recommendationDecisionReasonCategories).toEqual([
      "not_relevant",
      "already_addressed",
      "not_feasible",
      "wrong_timing",
      "insufficient_evidence",
      "other",
    ]);
  });

  it("allows only the system to supersede and prevents any later user decision", () => {
    expect(
      transitionRecommendationDecision({
        currentState: "accepted",
        command: "superseded",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
        actorType: "system",
      }).currentState,
    ).toBe("superseded");
    expect(() =>
      transitionRecommendationDecision({
        currentState: "accepted",
        command: "superseded",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
      }),
    ).toThrow("governed system");
    expect(availableRecommendationDecisionCommands("superseded")).toEqual([]);
  });

  it("evaluates 10,000 transitions inside the 500 ms command budget", () => {
    const started = performance.now();
    for (let index = 0; index < 10_000; index += 1) {
      transitionRecommendationDecision({
        currentState: "undecided",
        command: "accepted",
        ...fieldsByCommand.accepted,
      });
    }
    expect(performance.now() - started).toBeLessThan(500);
  });
});

function repository(overrides: Partial<RecommendationDecisionRepository> = {}) {
  return {
    getPortfolioItem: vi.fn().mockResolvedValue(source),
    getPortfolioItems: vi.fn().mockResolvedValue([source]),
    getDecision: vi.fn().mockResolvedValue(record()),
    getDecisionsForItems: vi.fn().mockResolvedValue([record()]),
    getDecisionEventByIdempotency: vi.fn().mockResolvedValue(null),
    recordDecision: vi.fn().mockResolvedValue({ id: "decision" }),
    ...overrides,
  } satisfies RecommendationDecisionRepository;
}

describe("S4-008 decision service, audit and tenant boundaries", () => {
  const input = {
    portfolioItemId: source.id,
    ...tenant,
    actorUserId: "88888888-8888-4888-8888-888888888888",
    command: "accepted" as const,
    expectedVersion: 0,
    idempotencyKey: "decision-command-00000001",
    ...fieldsByCommand.accepted,
  };

  it("records a governed command without changing the immutable portfolio baseline", async () => {
    const repo = repository();
    await new RecommendationDecisionService(repo).decide(input);
    expect(repo.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_item_id: source.id,
        organisation_id: tenant.organisationId,
        workspace_id: tenant.workspaceId,
        command: "accepted",
        expected_version: 0,
        payload_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  it("returns an exact duplicate without reapplying the transition", async () => {
    const firstRepo = repository();
    await new RecommendationDecisionService(firstRepo).decide(input);
    const payloadHash = (firstRepo.recordDecision as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .payload_hash as string;
    const replay = {
      id: "99999999-9999-4999-8999-999999999999",
      portfolioId: source.portfolioId,
      portfolioItemId: source.id,
      analysisRunId: source.analysisRunId,
      organisationId: source.organisationId,
      workspaceId: source.workspaceId,
      decisionVersion: 1,
      command: "accepted" as const,
      previousState: "undecided" as const,
      currentState: "accepted" as const,
      reasonCategory: null,
      reviewAt: null,
      acknowledged: true,
      actorType: "user" as const,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      occurredAt: "2026-08-03T09:00:00.000Z",
    };
    const repo = repository({
      getDecisionEventByIdempotency: vi.fn().mockResolvedValue(replay),
      getDecision: vi.fn().mockResolvedValue(record("accepted", 1, [replay])),
    });
    const result = await new RecommendationDecisionService(repo).decide(input);
    expect(result.version).toBe(1);
    expect(repo.recordDecision).not.toHaveBeenCalled();
  });

  it("fails a reused idempotency key with a different payload", async () => {
    const repo = repository({
      getDecisionEventByIdempotency: vi.fn().mockResolvedValue({
        id: "99999999-9999-4999-8999-999999999999",
        portfolioId: source.portfolioId,
        portfolioItemId: source.id,
        analysisRunId: source.analysisRunId,
        organisationId: source.organisationId,
        workspaceId: source.workspaceId,
        decisionVersion: 1,
        command: "accepted",
        previousState: "undecided",
        currentState: "accepted",
        reasonCategory: null,
        reviewAt: null,
        acknowledged: true,
        actorType: "user",
        actorUserId: input.actorUserId,
        portfolioPolicyVersion: source.portfolioPolicyVersion,
        catalogueVersionId: source.catalogueVersionId,
        catalogueDigest: source.catalogueDigest,
        idempotencyKey: input.idempotencyKey,
        payloadHash: "f".repeat(64),
        occurredAt: "2026-08-03T09:00:00.000Z",
      }),
    });
    await expect(new RecommendationDecisionService(repo).decide(input)).rejects.toMatchObject({
      code: "RECOMMENDATION_DECISION_INVALID",
      status: 409,
    });
  });

  it("fails closed for a cross-tenant item and maps stale concurrency", async () => {
    const denied = repository({ getPortfolioItem: vi.fn().mockResolvedValue(null) });
    await expect(new RecommendationDecisionService(denied).decide(input)).rejects.toMatchObject({
      code: "RECOMMENDATION_ACCESS_DENIED",
      status: 404,
    });
    const stale = repository({
      recordDecision: vi
        .fn()
        .mockRejectedValue(new Error("RECOMMENDATION_DECISION_VERSION_CONFLICT")),
    });
    await expect(new RecommendationDecisionService(stale).decide(input)).rejects.toMatchObject({
      code: "RECOMMENDATION_DECISION_VERSION_CONFLICT",
      status: 409,
    });
  });

  it("redacts actor and history in workspace output and preserves a complete audit export", () => {
    const event = {
      id: "99999999-9999-4999-8999-999999999999",
      ...source,
      decisionVersion: 1,
      command: "accepted" as const,
      previousState: "undecided" as const,
      currentState: "accepted" as const,
      reasonCategory: null,
      reviewAt: null,
      acknowledged: true,
      actorType: "user" as const,
      actorUserId: "88888888-8888-4888-8888-888888888888",
      idempotencyKey: "decision-command-00000001",
      payloadHash: "a".repeat(64),
      occurredAt: "2026-08-03T09:00:00.000Z",
    };
    const workspace = projectRecommendationDecision(record("accepted", 1, [event]), "workspace");
    expect(workspace).not.toHaveProperty("history");
    expect(workspace).not.toHaveProperty("lastActorUserId");
    const audit = projectRecommendationDecision(record("accepted", 1, [event]), "audit");
    expect(audit).toMatchObject({
      portfolioId: source.portfolioId,
      analysisRunId: source.analysisRunId,
      history: [expect.objectContaining({ previousState: "undecided", currentState: "accepted" })],
    });
  });

  it("ships accessible confirmation UX and removes the legacy normal-path accept control", () => {
    const component = readFileSync(
      new URL("../src/components/dashboard/recommendation-portfolio-section.tsx", import.meta.url),
      "utf8",
    );
    const dashboard = readFileSync(
      new URL("../src/components/dashboard/delivery-intelligence-dashboard.tsx", import.meta.url),
      "utf8",
    );
    const http = readFileSync(
      new URL("../src/lib/recommendation-decisions/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(component).toContain('role="group"');
    expect(component).toContain("aria-labelledby");
    expect(component).toContain("Confirm accept");
    expect(component).toContain("Confirm reject");
    expect(component).toContain("Generated advice");
    expect(component).toContain("Customer decision");
    expect(component).toContain("min-h-11");
    expect(dashboard).not.toContain("Accept recommendation");
    expect(http).toContain("assessmentRequestContext(request, { write: true })");
    expect(http).toContain('assertPermission(verified.identity, "assessment:submit")');
  });
});
