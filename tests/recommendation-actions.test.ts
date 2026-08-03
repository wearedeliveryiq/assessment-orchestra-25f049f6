import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  incompleteRequiredActionDependencies,
  transitionRecommendationAction,
  type RecommendationActionFields,
} from "@/lib/recommendation-actions/model";
import { projectRecommendationAction } from "@/lib/recommendation-actions/projection";
import {
  RecommendationActionService,
  type RecommendationActionRepository,
} from "@/lib/recommendation-actions/service.server";
import type {
  RecommendationActionRecord,
  RecommendationActionSource,
} from "@/lib/recommendation-actions/types";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};
const actorUserId = "88888888-8888-4888-8888-888888888888";
const source: RecommendationActionSource = {
  portfolioItemId: "11111111-1111-4111-8111-111111111111",
  portfolioId: "44444444-4444-4444-8444-444444444444",
  analysisRunId: "55555555-5555-4555-8555-555555555555",
  recommendationId: "rec_decision_rights",
  recommendationVersion: "1.0.0",
  title: "Define decision rights",
  generatedSequence: 1,
  ...tenant,
  dependencies: [],
  decisionId: "66666666-6666-4666-8666-666666666666",
  decisionVersion: 1,
  decisionState: "accepted",
};

const emptyFields: RecommendationActionFields = {
  accountableOwnerId: actorUserId,
  contributorIds: [],
  targetDate: null,
  note: null,
  completionNote: null,
  evidenceReferences: [],
  evidenceNotAvailableReason: null,
  dependencyOverride: false,
  dependencyOverrideReason: null,
  dependencyOverrideAcknowledged: false,
};

function action(overrides: Partial<RecommendationActionRecord> = {}): RecommendationActionRecord {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    planId: "99999999-9999-4999-8999-999999999999",
    planVersion: 1,
    portfolioId: source.portfolioId,
    portfolioItemId: source.portfolioItemId,
    analysisRunId: source.analysisRunId,
    recommendationId: source.recommendationId,
    recommendationVersion: source.recommendationVersion,
    sourceDecisionId: source.decisionId!,
    sourceDecisionVersion: source.decisionVersion,
    ...tenant,
    status: "not_started",
    version: 1,
    accountableOwnerId: actorUserId,
    contributorIds: [],
    targetDate: null,
    note: null,
    completionNote: null,
    evidenceReferences: [],
    evidenceNotAvailableReason: null,
    latestEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    createdAt: "2026-08-03T09:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    history: [],
    ...overrides,
  };
}

describe("S4-009 focused action lifecycle", () => {
  it("creates only the initial not-started state", () => {
    expect(
      transitionRecommendationAction({ currentState: null, command: "created", ...emptyFields }),
    ).toMatchObject({ previousState: null, currentState: "not_started" });
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "created",
        ...emptyFields,
      }),
    ).toThrow("already exists");
  });

  it("requires an owner and target date to start", () => {
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "started",
        ...emptyFields,
      }),
    ).toThrow("accountable owner and a target date");
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "started",
        ...emptyFields,
        accountableOwnerId: null,
        targetDate: "2026-09-30",
      }),
    ).toThrow("accountable owner and a target date");
    expect(
      transitionRecommendationAction({
        currentState: "not_started",
        command: "started",
        ...emptyFields,
        targetDate: "2026-09-30",
      }).currentState,
    ).toBe("in_progress");
  });

  it("blocks start for incomplete required dependencies unless risk is explicitly accepted", () => {
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "started",
        ...emptyFields,
        targetDate: "2026-09-30",
        blockingDependencyIds: ["rec_foundation"],
      }),
    ).toThrow("required dependency");
    expect(
      transitionRecommendationAction({
        currentState: "not_started",
        command: "started",
        ...emptyFields,
        targetDate: "2026-09-30",
        dependencyOverride: true,
        dependencyOverrideAcknowledged: true,
        dependencyOverrideReason: "Operational exception approved for the current window",
        blockingDependencyIds: ["rec_foundation"],
      }).currentState,
    ).toBe("in_progress");
  });

  it("requires completion note plus evidence or an explicit unavailable reason", () => {
    expect(() =>
      transitionRecommendationAction({
        currentState: "in_progress",
        command: "completed",
        ...emptyFields,
      }),
    ).toThrow("Completion requires");
    expect(
      transitionRecommendationAction({
        currentState: "in_progress",
        command: "completed",
        ...emptyFields,
        completionNote: "Decision forum established and operating.",
        evidenceReferences: ["governance-calendar-2026"],
      }).currentState,
    ).toBe("completed");
    expect(
      transitionRecommendationAction({
        currentState: "in_progress",
        command: "completed",
        ...emptyFields,
        completionNote: "Decision forum established and operating.",
        evidenceNotAvailableReason: "Evidence is held in a restricted customer system.",
      }).currentState,
    ).toBe("completed");
  });

  it("requires confirmation to cancel and keeps terminal states immutable", () => {
    expect(() =>
      transitionRecommendationAction({
        currentState: "blocked",
        command: "cancelled",
        ...emptyFields,
      }),
    ).toThrow("explicit confirmation");
    expect(
      transitionRecommendationAction({
        currentState: "blocked",
        command: "cancelled",
        cancelAcknowledged: true,
        ...emptyFields,
      }).currentState,
    ).toBe("cancelled");
    expect(() =>
      transitionRecommendationAction({
        currentState: "completed",
        command: "updated",
        ...emptyFields,
      }),
    ).toThrow("cannot be changed");
  });

  it("validates assignments and bounded focused fields", () => {
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "updated",
        ...emptyFields,
        contributorIds: [actorUserId],
      }),
    ).toThrow("cannot also be a contributor");
    expect(() =>
      transitionRecommendationAction({
        currentState: "not_started",
        command: "updated",
        ...emptyFields,
        note: "x".repeat(2_001),
      }),
    ).toThrow("Action note");
  });

  it("derives incomplete required dependencies deterministically", () => {
    const dependencies = [
      { recommendationId: "rec_b", type: "required" as const },
      { recommendationId: "rec_a", type: "required" as const },
      { recommendationId: "rec_c", type: "recommended" as const },
    ];
    expect(
      incompleteRequiredActionDependencies(dependencies, new Map([["rec_b", "completed"]])),
    ).toEqual(["rec_a"]);
  });

  it("evaluates 10,000 transitions within the 600 ms command target", () => {
    const started = performance.now();
    for (let index = 0; index < 10_000; index += 1) {
      transitionRecommendationAction({ currentState: null, command: "created", ...emptyFields });
    }
    expect(performance.now() - started).toBeLessThan(600);
  });
});

function repository(overrides: Partial<RecommendationActionRepository> = {}) {
  return {
    getActionSource: vi.fn().mockResolvedValue(source),
    getActionById: vi.fn().mockResolvedValue(action()),
    getActionForItem: vi.fn().mockResolvedValue(null),
    getActionsForPortfolio: vi.fn().mockResolvedValue([action()]),
    getDependencyActionStates: vi.fn().mockResolvedValue(new Map()),
    getActionEventByIdempotency: vi.fn().mockResolvedValue(null),
    recordAction: vi.fn().mockResolvedValue({ id: action().id }),
    ...overrides,
  } satisfies RecommendationActionRepository;
}

describe("S4-009 action service, isolation and notification boundary", () => {
  const createInput = {
    portfolioItemId: source.portfolioItemId,
    ...tenant,
    actorUserId,
    planVersion: 1,
    expectedVersion: 0 as const,
    idempotencyKey: "action-create-0000000001",
  };

  it("creates an action from accepted advice and notifies the accountable owner", async () => {
    const repo = repository({
      getActionEventByIdempotency: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ actionId: action().id }),
    });
    const notifier = vi.fn();
    await new RecommendationActionService(repo, notifier).create(createInput);
    expect(repo.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ command: "created", accountable_owner_id: actorUserId }),
    );
    expect(notifier).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: [actorUserId],
        eventType: "recommendation.action_created",
      }),
    );
  });

  it("reuses the one existing action for the item and plan without another notification", async () => {
    const existing = action();
    const repo = repository({ getActionForItem: vi.fn().mockResolvedValue(existing) });
    const notifier = vi.fn();
    await expect(new RecommendationActionService(repo, notifier).create(createInput)).resolves.toBe(
      existing,
    );
    expect(repo.recordAction).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("fails closed when advice is not accepted or belongs to another tenant", async () => {
    const rejected = repository({
      getActionSource: vi.fn().mockResolvedValue({ ...source, decisionState: "rejected" }),
    });
    await expect(
      new RecommendationActionService(rejected).create(createInput),
    ).rejects.toMatchObject({
      code: "RECOMMENDATION_ACCESS_DENIED",
      status: 404,
    });
    const denied = repository({ getActionSource: vi.fn().mockResolvedValue(null) });
    await expect(new RecommendationActionService(denied).create(createInput)).rejects.toMatchObject(
      {
        code: "RECOMMENDATION_ACCESS_DENIED",
        status: 404,
      },
    );
  });

  it("returns an exact replay without writing or notifying again", async () => {
    const firstRepo = repository();
    await new RecommendationActionService(firstRepo, vi.fn()).create(createInput);
    const payloadHash = (firstRepo.recordAction as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .payload_hash as string;
    const repo = repository({
      getActionEventByIdempotency: vi.fn().mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        actionId: action().id,
        planId: action().planId,
        portfolioItemId: source.portfolioItemId,
        ...tenant,
        actionVersion: 1,
        command: "created",
        previousState: null,
        currentState: "not_started",
        ...emptyFields,
        blockingDependencyIds: [],
        actorUserId,
        idempotencyKey: createInput.idempotencyKey,
        payloadHash,
        occurredAt: "2026-08-03T09:00:00.000Z",
      }),
    });
    const notifier = vi.fn();
    await new RecommendationActionService(repo, notifier).create(createInput);
    expect(repo.recordAction).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("maps stale optimistic concurrency without mutating the accepted decision", async () => {
    const current = action({ status: "not_started", version: 1 });
    const repo = repository({
      getActionById: vi.fn().mockResolvedValue(current),
      recordAction: vi.fn().mockRejectedValue(new Error("RECOMMENDATION_ACTION_VERSION_CONFLICT")),
    });
    await expect(
      new RecommendationActionService(repo).update({
        actionId: current.id,
        ...tenant,
        actorUserId,
        command: "updated",
        expectedVersion: 1,
        idempotencyKey: "action-update-0000000001",
        note: "Prepare the first governance session.",
      }),
    ).rejects.toMatchObject({ code: "RECOMMENDATION_ACTION_VERSION_CONFLICT", status: 409 });
  });

  it("replays an update before reading a now-advanced action version", async () => {
    const input = {
      actionId: action().id,
      ...tenant,
      actorUserId,
      command: "updated" as const,
      expectedVersion: 1,
      idempotencyKey: "action-update-replay-0001",
      note: "Prepare the first governance session.",
    };
    const firstRepo = repository();
    await new RecommendationActionService(firstRepo).update(input);
    const payloadHash = (firstRepo.recordAction as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .payload_hash as string;
    const repo = repository({
      getActionEventByIdempotency: vi.fn().mockResolvedValue({
        actionId: action().id,
        payloadHash,
      }),
      getActionById: vi.fn().mockResolvedValue(action({ version: 2, note: input.note })),
    });
    await expect(new RecommendationActionService(repo).update(input)).resolves.toMatchObject({
      version: 2,
      note: input.note,
    });
    expect(repo.recordAction).not.toHaveBeenCalled();
  });

  it("fails safely when an assigned workspace member becomes inactive", async () => {
    const repo = repository({
      recordAction: vi.fn().mockRejectedValue(new Error("RECOMMENDATION_ACCESS_DENIED")),
    });
    await expect(
      new RecommendationActionService(repo).update({
        actionId: action().id,
        ...tenant,
        actorUserId,
        command: "updated",
        expectedVersion: 1,
        idempotencyKey: "action-inactive-owner-001",
        accountableOwnerId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }),
    ).rejects.toMatchObject({ code: "RECOMMENDATION_ACCESS_DENIED", status: 404 });
  });

  it("redacts tenant and actor audit fields from the workspace projection", () => {
    const workspace = projectRecommendationAction(action(), "workspace");
    expect(workspace).not.toHaveProperty("organisationId");
    expect(workspace).not.toHaveProperty("history");
    const audit = projectRecommendationAction(action(), "audit");
    expect(audit).toMatchObject({ organisationId: tenant.organisationId, history: [] });
  });

  it("ships an accessible focused action UI and an improvement-lead permission boundary", () => {
    const component = readFileSync(
      new URL("../src/components/dashboard/recommendation-action-controls.tsx", import.meta.url),
      "utf8",
    );
    const http = readFileSync(
      new URL("../src/lib/recommendation-actions/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(component).toContain('role="group"');
    expect(component).toContain("Completion note");
    expect(component).toContain("Evidence reference");
    expect(component).toContain("Confirm cancellation");
    expect(component).toContain("does not claim");
    expect(http).toContain('assertPermission(verified.identity, "workspace:manage")');
  });
});
