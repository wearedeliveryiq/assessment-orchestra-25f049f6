import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import type { CatalogueVersionRecord } from "@/lib/recommendation-catalogue/types";
import type { RecommendationConfidenceGateRecord } from "@/lib/recommendation-confidence/types";
import type { RecommendationEvaluationRecord } from "@/lib/recommendation-evaluation/types";
import {
  buildRecommendationPortfolio,
  RecommendationPortfolioError,
  type RecommendationPortfolioCandidateInput,
} from "@/lib/recommendation-portfolio/model";
import {
  projectRecommendationPortfolio,
  recommendationPortfolioEtag,
  recommendationPortfolioEtagMatches,
} from "@/lib/recommendation-portfolio/projection";
import {
  RecommendationPortfolioService,
  type RecommendationPortfolioDependencies,
  type RecommendationPortfolioRepository,
} from "@/lib/recommendation-portfolio/service.server";
import type { RecommendationPortfolioRecord } from "@/lib/recommendation-portfolio/types";
import type { RecommendationPriorityRecord } from "@/lib/recommendation-priority/types";
import type { RecommendationSequenceRecord } from "@/lib/recommendation-sequencing/types";

const run = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  configurationSetId: "sprint03-product-config-1.0.0",
} as AssessmentAnalysisRun;

function candidate(
  recommendationId: string,
  overrides: Partial<RecommendationPortfolioCandidateInput> = {},
): RecommendationPortfolioCandidateInput {
  return {
    priorityItemId: `priority-${recommendationId}`,
    sequenceItemId: `sequence-${recommendationId}`,
    resolutionCandidateId: `resolution-${recommendationId}`,
    recommendationDefinitionId: `definition-${recommendationId}`,
    recommendationId,
    recommendationVersion: "1.0.0",
    catalogueOrder: 1,
    title: `Title ${recommendationId}`,
    outcome: `Outcome ${recommendationId}`,
    successMeasures: [`Measure ${recommendationId}`],
    matchedTriggers: [`opportunity:${recommendationId}`],
    generatedRank: 1,
    priorityLabel: "medium",
    impact: "medium",
    effort: "medium",
    urgency: 65,
    confidenceState: "high",
    confidenceResult: "presented",
    confidenceCaveat: null,
    generatedSequence: 1,
    generatedHorizon: "day60",
    sequenceState: "scheduled",
    sequenceReasonCode: "rank_and_horizon_fit",
    blockingDependencyIds: [],
    dependencies: [],
    caveats: [],
    rationale: [{ component: "impact", statement: "Governed impact is medium." }],
    sourceTraceNodeIds: [`trace-${recommendationId}`],
    ...overrides,
  };
}

describe("S4-007 deterministic recommendation portfolio", () => {
  it("applies every locked primary classification and precedence", () => {
    const output = buildRecommendationPortfolio({
      candidates: [
        candidate("immediate", {
          generatedRank: 1,
          catalogueOrder: 1,
          priorityLabel: "high",
          urgency: 90,
        }),
        candidate("foundation", {
          generatedRank: 2,
          catalogueOrder: 2,
          effort: "low",
        }),
        candidate("dependant", {
          generatedRank: 3,
          catalogueOrder: 3,
          dependencies: [
            {
              recommendationId: "foundation",
              sourceDependencyId: "foundation",
              type: "required",
              state: "available",
              resolution: "direct",
              reasonCode: "dependency_available",
            },
          ],
        }),
        candidate("quick", {
          generatedRank: 4,
          catalogueOrder: 4,
          effort: "low",
          impact: "high",
        }),
        candidate("strategic", {
          generatedRank: 5,
          catalogueOrder: 5,
          effort: "high",
          generatedHorizon: "day90",
        }),
        candidate("watch", { generatedRank: 6, catalogueOrder: 6 }),
      ],
    });
    expect(
      Object.fromEntries(output.items.map((item) => [item.recommendationId, item.primaryClass])),
    ).toEqual({
      immediate: "immediate_attention",
      foundation: "foundation",
      quick: "quick_win",
      strategic: "strategic_initiative",
      dependant: "watch",
      watch: "watch",
    });
    expect(output.items.find((item) => item.recommendationId === "foundation")).toMatchObject({
      primaryClass: "foundation",
      secondaryTags: ["quick_win"],
    });
  });

  it("recognises both approved immediate-attention causes but not high-pattern urgency", () => {
    for (const urgency of [90, 100]) {
      expect(
        buildRecommendationPortfolio({
          candidates: [candidate(`urgent-${urgency}`, { priorityLabel: "critical", urgency })],
        }).items[0].primaryClass,
      ).toBe("immediate_attention");
    }
    expect(
      buildRecommendationPortfolio({
        candidates: [candidate("high-pattern", { priorityLabel: "high", urgency: 80 })],
      }).items[0].primaryClass,
    ).toBe("watch");
  });

  it("does not classify an unmet required dependency as a quick win", () => {
    const item = buildRecommendationPortfolio({
      candidates: [
        candidate("blocked", {
          effort: "low",
          impact: "high",
          generatedSequence: null,
          generatedHorizon: null,
          sequenceState: "blocked_dependency",
          sequenceReasonCode: "blocked_dependency",
          blockingDependencyIds: ["missing"],
          dependencies: [
            {
              recommendationId: "missing",
              sourceDependencyId: "missing",
              type: "required",
              state: "unavailable",
              resolution: "unavailable",
              reasonCode: "dependency_unavailable",
            },
          ],
        }),
      ],
    }).items[0];
    expect(item.primaryClass).toBe("watch");
  });

  it("makes empty and partially scheduled states explicit", () => {
    expect(buildRecommendationPortfolio({ candidates: [] }).summary).toMatchObject({
      state: "empty",
      itemCount: 0,
      scheduledCount: 0,
    });
    const partial = buildRecommendationPortfolio({
      candidates: [
        candidate("scheduled"),
        candidate("capacity", {
          generatedRank: 2,
          catalogueOrder: 2,
          generatedSequence: null,
          generatedHorizon: null,
          sequenceState: "capacity_exceeded",
          sequenceReasonCode: "capacity_exceeded",
        }),
      ],
    });
    expect(partial.summary).toMatchObject({
      state: "partial",
      itemCount: 2,
      scheduledCount: 1,
      capacityExceededCount: 1,
    });
  });

  it("is stable under input order and assigns every item exactly once", () => {
    const candidates = [
      candidate("one", { generatedRank: 1, catalogueOrder: 1, effort: "low" }),
      candidate("two", { generatedRank: 2, catalogueOrder: 2, effort: "high" }),
      candidate("three", { generatedRank: 3, catalogueOrder: 3 }),
    ];
    const forward = buildRecommendationPortfolio({ candidates });
    const reversed = buildRecommendationPortfolio({ candidates: [...candidates].reverse() });
    expect(reversed).toEqual(forward);
    expect(new Set(forward.items.map((item) => item.recommendationId)).size).toBe(3);
    expect(forward.items.map((item) => item.portfolioOrder)).toEqual([1, 2, 3]);
    expect(
      Object.values(forward.summary.classCounts).reduce((total, count) => total + count, 0),
    ).toBe(3);
  });

  it("generates a 250-item portfolio within the two-second target and rejects larger inputs", () => {
    const candidates = Array.from({ length: 250 }, (_, index) =>
      candidate(`recommendation-${index + 1}`, {
        priorityItemId: `priority-${index + 1}`,
        sequenceItemId: `sequence-${index + 1}`,
        generatedRank: index + 1,
        catalogueOrder: index + 1,
        generatedSequence: index < 10 ? index + 1 : null,
        generatedHorizon: index < 3 ? "day30" : index < 6 ? "day60" : index < 10 ? "day90" : null,
        sequenceState: index < 10 ? "scheduled" : "capacity_exceeded",
        sequenceReasonCode: index < 10 ? "rank_and_horizon_fit" : "capacity_exceeded",
      }),
    );
    const started = performance.now();
    expect(buildRecommendationPortfolio({ candidates }).items).toHaveLength(250);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(() =>
      buildRecommendationPortfolio({ candidates: [...candidates, candidate("overflow")] }),
    ).toThrow("limited to 250 items");
  });

  it("fails closed on duplicate identity or incomplete trace coverage", () => {
    expect(() =>
      buildRecommendationPortfolio({ candidates: [candidate("same"), candidate("same")] }),
    ).toThrow("must be unique");
    expect(() =>
      buildRecommendationPortfolio({
        candidates: [candidate("trace-missing", { sourceTraceNodeIds: [] })],
      }),
    ).toThrow("Source trace node IDs must be non-empty");
  });
});

const catalogue = {
  id: "44444444-4444-4444-8444-444444444444",
  catalogueId: "deliveryiq-recommendations",
  version: "1.0.0",
  sourceConfigurationSetId: run.configurationSetId,
  contentDigest: "c".repeat(64),
  state: "active",
  authoredBy: "55555555-5555-4555-8555-555555555555",
  createdAt: "2026-08-03T00:00:00.000Z",
  snapshot: {
    catalogueId: "deliveryiq-recommendations",
    version: "1.0.0",
    sourceConfigurationSetId: run.configurationSetId,
    definitions: [
      {
        id: "foundation",
        version: "1.0.0",
        order: 1,
        title: "Foundation",
        impact: "medium",
        effort: "low",
        dedupeGroup: "foundation",
        triggers: { any: [{ opportunity: "governance" }] },
        exclusions: [],
        dependencies: [],
        conflicts: [],
        outcome: "Foundation outcome",
        successMeasures: ["Foundation measure"],
      },
      {
        id: "dependant",
        version: "1.0.0",
        order: 2,
        title: "Dependant",
        impact: "high",
        effort: "medium",
        dedupeGroup: "dependant",
        triggers: { any: [{ pattern: "pat_governance_sponsorship_gap" }] },
        exclusions: [],
        dependencies: ["foundation"],
        conflicts: [],
        outcome: "Dependant outcome",
        successMeasures: ["Dependant measure"],
      },
    ],
  },
} satisfies CatalogueVersionRecord;

const evaluation = {
  id: "55555555-5555-4555-8555-555555555555",
  analysisRunId: run.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueId: catalogue.catalogueId,
  catalogueVersion: catalogue.version,
  catalogueDigest: catalogue.contentDigest,
  candidates: [
    {
      id: "eval-foundation",
      recommendationId: "foundation",
      result: "eligible",
      matchedTriggers: ["opportunity:governance"],
    },
    {
      id: "eval-dependant",
      recommendationId: "dependant",
      result: "eligible",
      matchedTriggers: ["pattern:pat_governance_sponsorship_gap"],
    },
  ],
} as RecommendationEvaluationRecord;

const gate = {
  id: "66666666-6666-4666-8666-666666666666",
  analysisRunId: run.id,
  recommendationEvaluationId: evaluation.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueDigest: catalogue.contentDigest,
  confidenceState: "high",
  caveat: null,
} as RecommendationConfidenceGateRecord;

const priority = {
  id: "77777777-7777-4777-8777-777777777777",
  analysisRunId: run.id,
  recommendationEvaluationId: evaluation.id,
  confidenceGateId: gate.id,
  conflictResolutionId: "88888888-8888-4888-8888-888888888888",
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueId: catalogue.catalogueId,
  catalogueVersion: catalogue.version,
  catalogueDigest: catalogue.contentDigest,
  outputHash: "d".repeat(64),
  items: [
    {
      id: "priority-foundation",
      resolutionCandidateId: "resolution-foundation",
      recommendationDefinitionId: "definition-foundation",
      recommendationId: "foundation",
      recommendationVersion: "1.0.0",
      catalogueOrder: 1,
      postConfidenceResult: "presented",
      generatedRank: 2,
      priorityLabel: "medium",
      impact: "medium",
      effort: "low",
      components: {
        impact: 60,
        urgency: 65,
        confidence: 80,
        effortEase: 100,
        dependencyReadiness: 100,
      },
      rationale: [{ component: "impact", statement: "Governed impact is medium." }],
      sourceRecommendationIds: ["foundation"],
      sourceTraceNodeIds: ["trace-foundation"],
    },
    {
      id: "priority-dependant",
      resolutionCandidateId: "resolution-dependant",
      recommendationDefinitionId: "definition-dependant",
      recommendationId: "dependant",
      recommendationVersion: "1.0.0",
      catalogueOrder: 2,
      postConfidenceResult: "presented",
      generatedRank: 1,
      priorityLabel: "high",
      impact: "high",
      effort: "medium",
      components: {
        impact: 90,
        urgency: 100,
        confidence: 80,
        effortEase: 60,
        dependencyReadiness: 100,
      },
      rationale: [{ component: "impact", statement: "Governed impact is high." }],
      sourceRecommendationIds: ["dependant"],
      sourceTraceNodeIds: ["trace-dependant"],
    },
  ],
} as RecommendationPriorityRecord;

const sequence = {
  id: "99999999-9999-4999-8999-999999999999",
  analysisRunId: run.id,
  priorityModelId: priority.id,
  conflictResolutionId: priority.conflictResolutionId,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueId: catalogue.catalogueId,
  catalogueVersion: catalogue.version,
  catalogueDigest: catalogue.contentDigest,
  outputHash: "e".repeat(64),
  items: [
    {
      id: "sequence-foundation",
      priorityItemId: "priority-foundation",
      recommendationId: "foundation",
      recommendationVersion: "1.0.0",
      catalogueOrder: 1,
      generatedRank: 2,
      generatedSequence: 1,
      generatedHorizon: "day30",
      effort: "low",
      sequenceState: "scheduled",
      reasonCode: "dependency_precedence",
      blockingDependencyIds: [],
      caveats: [],
      sourceTraceNodeIds: ["trace-foundation"],
    },
    {
      id: "sequence-dependant",
      priorityItemId: "priority-dependant",
      recommendationId: "dependant",
      recommendationVersion: "1.0.0",
      catalogueOrder: 2,
      generatedRank: 1,
      generatedSequence: 2,
      generatedHorizon: "day60",
      effort: "medium",
      sequenceState: "scheduled",
      reasonCode: "dependency_satisfied",
      blockingDependencyIds: [],
      caveats: [],
      sourceTraceNodeIds: ["trace-dependant"],
    },
  ],
  dependencies: [
    {
      dependantRecommendationId: "dependant",
      sourceDependencyId: "foundation",
      resolvedDependencyId: "foundation",
      dependencyType: "required",
      resolution: "direct",
      state: "available",
      reasonCode: "dependency_available",
    },
  ],
} as RecommendationSequenceRecord;

function storedPortfolio(): RecommendationPortfolioRecord {
  const output = buildRecommendationPortfolio({
    candidates: [
      candidate("foundation", {
        priorityItemId: "priority-foundation",
        sequenceItemId: "sequence-foundation",
        resolutionCandidateId: "resolution-foundation",
        recommendationDefinitionId: "definition-foundation",
        title: "Foundation",
        outcome: "Foundation outcome",
        successMeasures: ["Foundation measure"],
        matchedTriggers: ["opportunity:governance"],
        generatedRank: 2,
        priorityLabel: "medium",
        effort: "low",
        generatedSequence: 1,
        generatedHorizon: "day30",
        sequenceReasonCode: "dependency_precedence",
      }),
      candidate("dependant", {
        priorityItemId: "priority-dependant",
        sequenceItemId: "sequence-dependant",
        resolutionCandidateId: "resolution-dependant",
        recommendationDefinitionId: "definition-dependant",
        catalogueOrder: 2,
        title: "Dependant",
        outcome: "Dependant outcome",
        successMeasures: ["Dependant measure"],
        matchedTriggers: ["pattern:pat_governance_sponsorship_gap"],
        generatedRank: 1,
        priorityLabel: "high",
        impact: "high",
        urgency: 100,
        generatedSequence: 2,
        dependencies: [
          {
            recommendationId: "foundation",
            sourceDependencyId: "foundation",
            type: "required",
            state: "available",
            resolution: "direct",
            reasonCode: "dependency_available",
          },
        ],
        sequenceReasonCode: "dependency_satisfied",
        sourceTraceNodeIds: ["trace-dependant"],
      }),
    ],
  });
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    analysisRunId: run.id,
    recommendationEvaluationId: evaluation.id,
    confidenceGateId: gate.id,
    conflictResolutionId: priority.conflictResolutionId,
    priorityModelId: priority.id,
    sequenceModelId: sequence.id,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    configurationSetId: run.configurationSetId,
    catalogueVersionId: catalogue.id,
    catalogueId: catalogue.catalogueId,
    catalogueVersion: catalogue.version,
    catalogueDigest: catalogue.contentDigest,
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
      id: `portfolio-item-${index + 1}`,
      portfolioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "f".repeat(64),
    })),
    createdAt: "2026-08-03T11:00:00.000Z",
  };
}

describe("S4-007 projection and cache contract", () => {
  it("groups the accessible workspace contract and redacts audit-only detail", () => {
    const record = storedPortfolio();
    const workspace = projectRecommendationPortfolio(record, "workspace");
    expect(workspace.summary).toMatchObject({ state: "complete", itemCount: 2 });
    expect(workspace.groups).toHaveLength(5);
    expect(workspace.groups.flatMap((group) => group.recommendations)).toHaveLength(2);
    expect(workspace).not.toHaveProperty("organisationId");
    expect(JSON.stringify(workspace)).not.toContain("sourceTraceNodeIds");
    const audit = projectRecommendationPortfolio(record, "audit");
    expect(audit).toMatchObject({
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      outputHash: "b".repeat(64),
    });
    expect(JSON.stringify(audit)).toContain("trace-foundation");
    expect(projectRecommendationPortfolio(record, "public")).toEqual({
      portfolioState: "complete",
      recommendationCount: 2,
    });
  });

  it("uses the immutable semantic hash as a strong ETag and recognises conditional reads", () => {
    const record = storedPortfolio();
    const etag = recommendationPortfolioEtag(record);
    expect(etag).toBe(`"${"b".repeat(64)}"`);
    expect(recommendationPortfolioEtagMatches(etag, etag)).toBe(true);
    expect(recommendationPortfolioEtagMatches(`"stale", ${etag}`, etag)).toBe(true);
    expect(recommendationPortfolioEtagMatches("*", etag)).toBe(true);
    expect(recommendationPortfolioEtagMatches('"stale"', etag)).toBe(false);
  });
});

function serviceHarness(existing: RecommendationPortfolioRecord | null = null) {
  let published: Record<string, unknown> | null = null;
  const repo: RecommendationPortfolioRepository = {
    getPortfolio: vi.fn(async () => existing),
    getPortfolioForRun: vi.fn(async () => existing),
    getPortfolioById: vi.fn(async () => existing),
    publishPortfolio: vi.fn(async (input) => {
      published = input;
      return storedPortfolio();
    }),
  };
  const deps: RecommendationPortfolioDependencies = {
    getPriorityModelForRun: vi.fn(async () => priority),
    getSequenceModelForRun: vi.fn(async () => sequence),
    getEvaluation: vi.fn(async () => evaluation),
    getConfidenceGateForRun: vi.fn(async () => gate),
    getCatalogueVersion: vi.fn(async () => catalogue),
  };
  return {
    service: new RecommendationPortfolioService(repo, deps),
    repo,
    deps,
    published: () => published,
  };
}

describe("S4-007 governed publication and tenant isolation", () => {
  it("publishes once with pinned lineage and reuses the immutable portfolio", async () => {
    const first = serviceHarness();
    await expect(first.service.publish(run)).resolves.toMatchObject({ reused: false });
    expect(first.published()).toMatchObject({
      analysis_run_id: run.id,
      recommendation_evaluation_id: evaluation.id,
      priority_model_id: priority.id,
      sequence_model_id: sequence.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      policy_version: "PB-004/S4-007/1.0.0",
      portfolio_state: "complete",
      item_count: 2,
    });
    const existing = storedPortfolio();
    const replay = serviceHarness(existing);
    await expect(replay.service.publish(run)).resolves.toEqual({
      portfolio: existing,
      reused: true,
    });
    expect(replay.repo.publishPortfolio).not.toHaveBeenCalled();
  });

  it("fails closed before publication when any upstream tenant scope differs", async () => {
    const { service, deps, repo } = serviceHarness();
    vi.mocked(deps.getSequenceModelForRun).mockResolvedValue({
      ...sequence,
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    await expect(service.publish(run)).rejects.toMatchObject({
      code: "PORTFOLIO_PUBLICATION_FAILED",
      status: 422,
    });
    expect(repo.publishPortfolio).not.toHaveBeenCalled();
  });

  it("fails closed when evaluation, priority and sequence items do not reconcile", async () => {
    const { service, deps, repo } = serviceHarness();
    vi.mocked(deps.getSequenceModelForRun).mockResolvedValue({
      ...sequence,
      items: [{ ...sequence.items[0], generatedRank: 99 }, sequence.items[1]],
    });
    await expect(service.publish(run)).rejects.toMatchObject({
      code: "PORTFOLIO_PUBLICATION_FAILED",
      status: 422,
    });
    expect(repo.publishPortfolio).not.toHaveBeenCalled();
  });

  it("returns non-enumerating tenant-scoped lookup results", async () => {
    const existing = storedPortfolio();
    const { service, repo } = serviceHarness(existing);
    await expect(
      service.getById(existing.id, {
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
      }),
    ).resolves.toBe(existing);
    expect(repo.getPortfolioById).toHaveBeenCalledWith(existing.id, {
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
    });
  });
});
