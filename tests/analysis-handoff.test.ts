import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AssessmentSession } from "@/lib/assessment/types";
import {
  AnalysisHandoffService,
  type HandoffDependencies,
} from "@/lib/analysis/handoff-service.server";
import type { AssessmentAnalysisHandoff } from "@/lib/analysis/handoff-types";
import { AnalysisServiceError } from "@/lib/analysis/service.server";
import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import { configuredQuestionIds } from "@/lib/analysis/eligibility";

const session: AssessmentSession = {
  id: "11111111-1111-4111-8111-111111111111",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  createdByUserId: "44444444-4444-4444-8444-444444444444",
  organisationName: "DeliveryIQ Handoff Test",
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
  assessmentRevision: 1,
  consentBasis: "authenticated_assessment_submission",
};

const handoff: AssessmentAnalysisHandoff = {
  id: "55555555-5555-4555-8555-555555555555",
  assessmentSessionId: session.id,
  organisationId: session.organisationId,
  workspaceId: session.workspaceId,
  assessmentRevision: 1,
  configurationSetId: "sprint03-product-config-1.0.0",
  requestedMode: "workspace",
  status: "processing",
  attempt: 1,
  correlationId: "66666666-6666-4666-8666-666666666666",
  analysisRunId: null,
  eligibilityDecisionId: null,
  lastErrorCode: null,
  nextAttemptAt: "2026-08-02T00:01:00.000Z",
  claimedAt: "2026-08-02T00:01:01.000Z",
  deliveredAt: null,
  createdAt: "2026-08-02T00:01:00.000Z",
  updatedAt: "2026-08-02T00:01:01.000Z",
};

const run = {
  id: "77777777-7777-4777-8777-777777777777",
  assessmentSessionId: session.id,
  organisationId: session.organisationId,
  workspaceId: session.workspaceId,
  assessmentRevision: 1,
  requestedMode: "workspace",
  configurationSetId: "sprint03-product-config-1.0.0",
  status: "queued",
  retryable: null,
  correlationId: handoff.correlationId,
} as AssessmentAnalysisRun;

const context = {
  ownerKey: `${session.createdByUserId}:${session.workspaceId}`,
  organisationId: session.organisationId,
  workspaceId: session.workspaceId,
  userId: session.createdByUserId,
};

function harness(overrides: Partial<HandoffDependencies> = {}) {
  let latest: AssessmentAnalysisRun | null = null;
  const events: string[] = [];
  const dependencies: HandoffDependencies = {
    getSession: vi.fn(async () => session),
    getSessionById: vi.fn(async () => session),
    getResponses: vi.fn(async () =>
      configuredQuestionIds.map((questionId) => ({
        questionId,
        sectionId: "delivery-dna",
        value: 3,
        score: 3,
        notes: null,
        answeredAt: session.completedAt!,
        evidenceStatus: "answered" as const,
      })),
    ),
    findCompletedExecution: vi.fn(async () => ({
      id: crypto.randomUUID(),
      assessmentSessionId: session.id,
      ownerKey: `${session.createdByUserId}:${session.workspaceId}`,
      organisationName: session.organisationName,
      knowledgePackId: "delivery-dna",
      knowledgePackVersion: "1.0.0",
      pipelineId: "assessment",
      pipelineVersion: "1.0.0",
      status: "completed",
      currentStage: null,
      progress: 100,
      startedAt: session.submittedAt,
      completedAt: session.completedAt,
      durationMs: 1000,
      errorMessage: null,
      failureClass: null,
      retryCount: 0,
      executionMode: "triggered",
      correlationId: handoff.correlationId,
      cancelRequested: false,
      heartbeatAt: session.completedAt,
      metadata: {},
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
    ensureHandoff: vi.fn(async () => handoff),
    getHandoff: vi.fn(async () => handoff),
    claimHandoffs: vi.fn(async () => [handoff]),
    claimHandoff: vi.fn(async () => handoff),
    completeHandoff: vi.fn(async (_id, runId) => ({
      ...handoff,
      status: "delivered",
      analysisRunId: runId,
      deliveredAt: "2026-08-02T00:01:02.000Z",
    })),
    failHandoff: vi.fn(async (_id, code) => ({
      ...handoff,
      status: "failed",
      lastErrorCode: code,
    })),
    reconcileHandoffs: vi.fn(async () => 0),
    appendEvent: vi.fn(async (_handoff, event) => {
      events.push(event);
    }),
    persistEligibilityDecision: vi.fn(async (input) => ({
      id: "88888888-8888-4888-8888-888888888888",
      handoffId: handoff.id,
      assessmentSessionId: session.id,
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
      assessmentRevision: 1,
      configurationSetId: "sprint03-product-config-1.0.0",
      status: input.status as "eligible" | "ineligible",
      primaryReasonCode: input.primary_reason_code as string | null,
      secondaryReasonCodes: input.secondary_reason_codes as string[],
      correlationId: handoff.correlationId,
      analysisRunId: null,
    })),
    getEligibilityDecision: vi.fn(async () => null),
    attachEligibilityDecision: vi.fn(async () => ({
      ...handoff,
      eligibilityDecisionId: "88888888-8888-4888-8888-888888888888",
    })),
    markHandoffIneligible: vi.fn(async () => ({
      ...handoff,
      status: "ineligible" as const,
      eligibilityDecisionId: "88888888-8888-4888-8888-888888888888",
    })),
    requestAnalysis: vi.fn(async () => {
      latest = run;
      return { run, reused: false, httpStatus: 202 } as const;
    }),
    latestRun: vi.fn(async () => latest),
    driveRun: vi.fn(async () => ({ ...run, status: "completed" })),
    retryRun: vi.fn(async () => ({ ...run, status: "queued" })),
    now: () => Date.parse("2026-08-02T00:01:10.000Z"),
    ...overrides,
  };
  return {
    service: new AnalysisHandoffService(dependencies),
    dependencies,
    events,
    setLatest(value: AssessmentAnalysisRun | null) {
      latest = value;
    },
  };
}

describe("PDR-003-001 durable automatic analysis hand-off", () => {
  it("requests one idempotent run and marks the durable hand-off delivered", async () => {
    const { service, dependencies, events } = harness();
    await expect(service.processClaimed(handoff)).resolves.toMatchObject({ id: run.id });
    expect(dependencies.requestAnalysis).toHaveBeenCalledWith(
      { assessmentId: session.id, requestedMode: "workspace" },
      expect.objectContaining({
        organisationId: session.organisationId,
        workspaceId: session.workspaceId,
        correlationId: handoff.correlationId,
      }),
    );
    expect(dependencies.completeHandoff).toHaveBeenCalledWith(handoff.id, run.id);
    expect(dependencies.driveRun).toHaveBeenCalledWith(run.id);
    expect(events).toEqual([
      "analysis.eligibility_evaluated",
      "analysis.requested",
      "analysis.request_created",
    ]);
  });

  it("records a retryable hand-off failure without changing assessment completion", async () => {
    const { service, dependencies, events } = harness({
      requestAnalysis: vi.fn(async () => {
        throw new AnalysisServiceError("safe", 503, "ANALYSIS_EXECUTION_TRANSIENT");
      }),
    });
    await expect(service.processClaimed(handoff)).rejects.toMatchObject({
      code: "ANALYSIS_EXECUTION_TRANSIENT",
    });
    expect(session.status).toBe("completed");
    expect(dependencies.failHandoff).toHaveBeenCalledWith(
      handoff.id,
      "ANALYSIS_EXECUTION_TRANSIENT",
    );
    expect(events).toEqual([
      "analysis.eligibility_evaluated",
      "analysis.requested",
      "analysis.handoff_failed",
    ]);
  });

  it("terminates an incompatible legacy assessment without creating an analysis run", async () => {
    const { service, dependencies, events } = harness({
      getSessionById: vi.fn(async () => ({ ...session, assessmentType: "delivery-maturity" })),
      findCompletedExecution: vi.fn(async () => ({
        ...(await vi.mocked(harness().dependencies.findCompletedExecution)(
          session.id,
          context.ownerKey,
        ))!,
        knowledgePackId: "executive-sponsorship",
        knowledgePackVersion: "1.4.0",
      })),
      getResponses: vi.fn(async () => [
        {
          questionId: "flow.legacy",
          sectionId: "flow",
          value: 3,
          score: 3,
          notes: null,
          answeredAt: session.completedAt!,
          evidenceStatus: "answered",
        },
      ]),
    });
    await expect(service.processClaimed(handoff)).resolves.toBeNull();
    expect(dependencies.markHandoffIneligible).toHaveBeenCalledOnce();
    expect(dependencies.requestAnalysis).not.toHaveBeenCalled();
    expect(dependencies.driveRun).not.toHaveBeenCalled();
    expect(events).toEqual(["analysis.eligibility_evaluated", "analysis.ineligible_terminal"]);
  });

  it("reconciles missing completion events and processes claimed rows", async () => {
    const { service, dependencies } = harness({
      reconcileHandoffs: vi.fn(async () => 2),
    });
    await expect(service.reconcile(100)).resolves.toEqual({ created: 2, processed: 1, failed: 0 });
    expect(dependencies.reconcileHandoffs).toHaveBeenCalledWith(100);
  });

  it("fails closed when a retry is attempted across a tenant boundary", async () => {
    const { service } = harness({ getSession: vi.fn(async () => session) });
    await expect(
      service.ensureForAssessment(session.id, { ...context, workspaceId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ code: "ANALYSIS_ACCESS_DENIED", status: 404 });
  });

  it("exposes retry only after the 15-second missing hand-off window", async () => {
    const before = harness({
      getHandoff: vi.fn(async () => null),
      now: () => Date.parse("2026-08-02T00:01:14.999Z"),
    });
    await expect(before.service.view(session.id, context)).resolves.toMatchObject({
      state: "preparing",
      retryable: false,
    });
    const after = harness({
      getHandoff: vi.fn(async () => null),
      now: () => Date.parse("2026-08-02T00:01:15.000Z"),
    });
    await expect(after.service.view(session.id, context)).resolves.toMatchObject({
      state: "missing",
      retryable: true,
      safeMessage: "We couldn't start your Delivery Intelligence. Your assessment is safe.",
    });
  });

  it("reuses a failed run through the bounded retry contract", async () => {
    const failed = { ...run, status: "failed", retryable: true } as AssessmentAnalysisRun;
    const { service, dependencies } = harness({ latestRun: vi.fn(async () => failed) });
    vi.mocked(dependencies.retryRun).mockResolvedValue({ ...failed, status: "queued" });
    await expect(service.requestRetry(session.id, context)).resolves.toMatchObject({
      id: run.id,
      status: "queued",
    });
    expect(dependencies.retryRun).toHaveBeenCalledWith(run.id);
    expect(dependencies.driveRun).toHaveBeenCalledWith(run.id);
  });

  it("is double-click safe when a queued run already exists", async () => {
    const queued = { ...run, status: "queued" } as AssessmentAnalysisRun;
    const { service, dependencies } = harness({ latestRun: vi.fn(async () => queued) });
    const [first, second] = await Promise.all([
      service.requestRetry(session.id, context),
      service.requestRetry(session.id, context),
    ]);
    expect(first.id).toBe(queued.id);
    expect(second.id).toBe(queued.id);
    expect(dependencies.retryRun).not.toHaveBeenCalled();
    expect(dependencies.requestAnalysis).not.toHaveBeenCalled();
  });

  it("rejects an early retry and a non-retryable terminal run server-side", async () => {
    const early = harness({
      getHandoff: vi.fn(async () => ({ ...handoff, status: "pending" })),
      now: () => Date.parse("2026-08-02T00:01:14.999Z"),
    });
    await expect(early.service.requestRetry(session.id, context)).rejects.toMatchObject({
      code: "ANALYSIS_RETRY_NOT_AVAILABLE",
      status: 409,
    });

    const terminal = harness({
      latestRun: vi.fn(async () => ({ ...run, status: "failed", retryable: false })),
    });
    await expect(terminal.service.requestRetry(session.id, context)).rejects.toMatchObject({
      code: "ANALYSIS_RETRY_NOT_AVAILABLE",
      status: 409,
    });
  });

  it("ships the reconciler as a native one-minute deployment task", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    const task = readFileSync(resolve(process.cwd(), "tasks/analysis/reconcile.ts"), "utf8");
    expect(config).toContain('"* * * * *": "analysis:reconcile"');
    expect(config).toContain("handler: analysisReconcilerTask");
    expect(task).toContain("analysisHandoffService.reconcile(100)");
  });

  it("keeps generation automatic and exposes only the governed retry action", () => {
    const dashboard = readFileSync(
      resolve(process.cwd(), "src/components/dashboard/delivery-intelligence-dashboard.tsx"),
      "utf8",
    );
    expect(dashboard).not.toMatch(/Generate intelligence/i);
    expect(dashboard).toContain("Retry analysis");
    expect(dashboard).toContain('aria-live="polite"');
    expect(dashboard).toContain("retry.isPending");
  });
});
