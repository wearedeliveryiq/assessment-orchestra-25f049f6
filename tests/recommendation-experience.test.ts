import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { describe, expect, it, vi } from "vitest";

import { buildRecommendationPortfolio } from "@/lib/recommendation-portfolio/model";
import type { RecommendationPortfolioRecord } from "@/lib/recommendation-portfolio/types";
import type { RecommendationDecisionRecord } from "@/lib/recommendation-decisions/types";
import type { RecommendationActionRecord } from "@/lib/recommendation-actions/types";
import {
  projectRecommendationExperience,
  RecommendationExperienceError,
} from "@/lib/recommendation-experience/model";
import {
  RecommendationExperienceService,
  type RecommendationExperienceSources,
} from "@/lib/recommendation-experience/service.server";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};

function portfolio(count = 1): RecommendationPortfolioRecord {
  const output = buildRecommendationPortfolio({
    candidates: Array.from({ length: count }, (_, index) => ({
      priorityItemId: `priority-${index}`,
      sequenceItemId: `sequence-${index}`,
      resolutionCandidateId: `resolution-${index}`,
      recommendationDefinitionId: `definition-${index}`,
      recommendationId: index === 0 ? "rec_decision_rights" : `rec_experience_${index}`,
      recommendationVersion: "1.0.0",
      catalogueOrder: index + 1,
      title: `Recommendation ${index + 1}`,
      outcome: `Expected outcome ${index + 1}`,
      successMeasures: [`Success measure ${index + 1}`],
      matchedTriggers: [index % 2 ? "pattern:delivery_gap" : "opportunity:governance"],
      generatedRank: index + 1,
      priorityLabel: index === 0 ? ("high" as const) : ("medium" as const),
      impact: "high" as const,
      effort: "medium" as const,
      urgency: 90,
      confidenceState: "high" as const,
      confidenceResult: "presented" as const,
      confidenceCaveat: null,
      generatedSequence: index + 1,
      generatedHorizon: "day60" as const,
      sequenceState: "scheduled" as const,
      sequenceReasonCode: "rank_and_horizon_fit",
      blockingDependencyIds: [],
      dependencies: [],
      caveats: [],
      rationale: [{ component: "impact" as const, statement: "Governed impact is high." }],
      sourceTraceNodeIds: [`trace-${index}`],
    })),
  });
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    analysisRunId: "11111111-1111-4111-8111-111111111111",
    recommendationEvaluationId: "44444444-4444-4444-8444-444444444444",
    confidenceGateId: "55555555-5555-4555-8555-555555555555",
    conflictResolutionId: "66666666-6666-4666-8666-666666666666",
    priorityModelId: "77777777-7777-4777-8777-777777777777",
    sequenceModelId: "88888888-8888-4888-8888-888888888888",
    ...tenant,
    configurationSetId: "sprint03-product-config-1.0.0",
    catalogueVersionId: "99999999-9999-4999-8999-999999999999",
    catalogueId: "deliveryiq-recommendations",
    catalogueVersion: "1.0.0",
    catalogueDigest: "c".repeat(64),
    policyVersion: output.policyVersion,
    projectorVersion: output.projectorVersion,
    state: output.summary.state,
    itemCount: output.summary.itemCount,
    scheduledCount: output.summary.scheduledCount,
    inputHash: "a".repeat(64),
    outputHash: "b".repeat(64),
    canonicalInput: {} as RecommendationPortfolioRecord["canonicalInput"],
    canonicalPortfolio: output,
    items: output.items.map((item, index) => ({
      ...item,
      id: `portfolio-item-${index}`,
      portfolioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ...tenant,
      semanticHash: "d".repeat(64),
    })),
    createdAt: "2026-08-03T11:00:00.000Z",
  };
}

function decision(source: RecommendationPortfolioRecord): RecommendationDecisionRecord {
  const item = source.items[0];
  return {
    id: "decision-1",
    portfolioId: source.id,
    portfolioItemId: item.id,
    analysisRunId: source.analysisRunId,
    recommendationId: item.recommendationId,
    recommendationVersion: item.recommendationVersion,
    ...tenant,
    currentState: "accepted",
    version: 1,
    reasonCategory: null,
    reviewAt: null,
    acknowledged: true,
    lastActorType: "user",
    lastActorUserId: "actor-1",
    updatedAt: "2026-08-03T12:00:00.000Z",
    history: [],
  };
}

function action(source: RecommendationPortfolioRecord): RecommendationActionRecord {
  const item = source.items[0];
  return {
    id: "action-1",
    planId: "plan-1",
    planVersion: 1,
    portfolioId: source.id,
    portfolioItemId: item.id,
    analysisRunId: source.analysisRunId,
    recommendationId: item.recommendationId,
    recommendationVersion: item.recommendationVersion,
    sourceDecisionId: "decision-1",
    sourceDecisionVersion: 1,
    ...tenant,
    status: "in_progress",
    version: 2,
    accountableOwnerId: "actor-1",
    contributorIds: [],
    targetDate: "2026-09-30",
    note: null,
    completionNote: null,
    evidenceReferences: [],
    evidenceNotAvailableReason: null,
    latestEventId: "event-1",
    createdAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-03T12:10:00.000Z",
    startedAt: "2026-08-03T12:10:00.000Z",
    completedAt: null,
    cancelledAt: null,
    history: [],
  };
}

describe("S4-012 recommendation experience and executive reporting", () => {
  it("reconciles the immutable baseline with clearly labelled customer overlays", () => {
    const stored = portfolio();
    const projected = projectRecommendationExperience({
      portfolio: stored,
      decisions: [decision(stored)],
      actions: [action(stored)],
      products: [
        {
          targetType: "knowledge_pack",
          targetId: "governance",
          targetVersion: "1.0.0",
          status: "active",
          entitled: false,
          activated: false,
        },
      ],
      permissions: ["assessment:read", "assessment:submit", "workspace:manage"],
      snapshotAt: "2026-08-03T13:00:00.000Z",
      snapshotVersion: "e".repeat(64),
    });
    const item = projected.groups.flatMap((group) => group.recommendations)[0];
    expect(projected.labels).toEqual({
      generated: "Generated advice",
      customer: "Customer decision and progress",
    });
    expect(item).toMatchObject({
      title: "Recommendation 1",
      decision: { currentDecision: "accepted" },
      action: { status: "in_progress" },
      sourceVersions: {
        recommendation: "1.0.0",
        catalogue: "1.0.0",
        configurationSet: "sprint03-product-config-1.0.0",
      },
    });
    expect(item.handoffs).toHaveLength(1);
    expect(projected.report.associationNotice).toContain("does not prove");
    expect(projected.snapshot).toMatchObject({
      at: "2026-08-03T13:00:00.000Z",
      version: "e".repeat(64),
      generatedBaselineVersion: stored.policyVersion,
    });
    expect(JSON.stringify(projected)).not.toContain("sourceTraceNodeIds");
    expect(JSON.stringify(projected)).not.toContain("canonicalInput");
  });

  it.each([
    [[], false, false, false, false],
    [["assessment:submit"], true, false, false, false],
    [["workspace:manage"], false, true, false, false],
    [["audit:read"], false, false, true, false],
    [["member:role_change"], false, false, false, true],
  ] as const)(
    "derives controls only from current permissions",
    (permissions, decide, actions, audit, membership) => {
      const projected = projectRecommendationExperience({
        portfolio: portfolio(),
        decisions: [],
        actions: [],
        products: [],
        permissions,
        snapshotAt: "2026-08-03T13:00:00.000Z",
        snapshotVersion: "f".repeat(64),
      });
      expect(projected.controls).toMatchObject({
        canDecide: decide,
        canManageActions: actions,
        canViewAudit: audit,
        canManageMembership: membership,
      });
    },
  );

  it("loads each governed source once and keeps a stable semantic snapshot", async () => {
    const stored = portfolio(250);
    const calls = { portfolio: 0, decisions: 0, actions: 0, products: 0 };
    const sources: RecommendationExperienceSources = {
      getPortfolio: async () => (calls.portfolio++, stored),
      getDecisions: async () => (calls.decisions++, []),
      getActions: async () => (calls.actions++, []),
      getProducts: async () => (calls.products++, []),
    };
    const service = new RecommendationExperienceService(sources);
    const started = performance.now();
    const first = await service.get({ portfolioId: stored.id, ...tenant, permissions: [] });
    const warmStarted = performance.now();
    const second = await service.get({ portfolioId: stored.id, ...tenant, permissions: [] });
    expect(first.summary.recommendationCount).toBe(250);
    expect(second.snapshot.version).toBe(first.snapshot.version);
    expect(calls).toEqual({ portfolio: 2, decisions: 2, actions: 2, products: 2 });
    expect(performance.now() - warmStarted).toBeLessThan(700);
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("fails closed when any overlay escapes the requested tenant or portfolio", async () => {
    const stored = portfolio();
    const escaped = { ...decision(stored), organisationId: "other-tenant" };
    const service = new RecommendationExperienceService({
      getPortfolio: async () => stored,
      getDecisions: async () => [escaped],
      getActions: async () => [],
      getProducts: async () => [],
    });
    await expect(
      service.get({ portfolioId: stored.id, ...tenant, permissions: [] }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<RecommendationExperienceError>>({
        code: "RECOMMENDATION_ACCESS_DENIED",
        status: 404,
      }),
    );
  });

  it("provides semantic, keyboard-operable, responsive and print-ready UI without N+1 reads", () => {
    const portfolioSource = readFileSync(
      new URL("../src/components/dashboard/recommendation-portfolio-section.tsx", import.meta.url),
      "utf8",
    );
    const handoffSource = readFileSync(
      new URL("../src/components/dashboard/recommendation-handoff-controls.tsx", import.meta.url),
      "utf8",
    );
    expect(portfolioSource).toContain("<article");
    expect(portfolioSource).toContain("<details");
    expect(portfolioSource).toContain("<summary");
    expect(portfolioSource).toContain("window.print()");
    expect(portfolioSource).toContain("min-w-0");
    expect(portfolioSource).toContain("sm:p-6");
    expect(portfolioSource).toContain('role="alert"');
    expect(portfolioSource).toContain('aria-live="polite"');
    expect(handoffSource).not.toContain("fetchProductHandoffOpportunities");
    expect(handoffSource).not.toContain("useQuery(");
  });

  it("uses conditional HTTP caching and rechecks permissions on every request", () => {
    const source = readFileSync(
      new URL("../src/lib/recommendation-experience/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('assertPermission(verified.identity, "assessment:read")');
    expect(source).toContain('request.headers.get("if-none-match")');
    expect(source).toContain("status: 304");
    expect(source).toContain('vary: "cookie, authorization"');
  });
});
