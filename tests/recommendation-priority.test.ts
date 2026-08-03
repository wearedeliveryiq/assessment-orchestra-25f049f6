import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import { calculateRecommendationRankScore } from "@/lib/delivery-intelligence/recommendations";
import type { StoredIntelligenceResult } from "@/lib/delivery-intelligence/result-repository.server";
import { validateCatalogueSnapshot } from "@/lib/recommendation-catalogue/catalogue";
import type {
  CatalogueDefinition,
  CatalogueSnapshot,
  CatalogueVersionRecord,
} from "@/lib/recommendation-catalogue/types";
import type { RecommendationConfidenceGateRecord } from "@/lib/recommendation-confidence/types";
import {
  applyDisplayOrderPreference,
  buildRecommendationPriority,
  recommendationPriorityLabel,
  RecommendationPriorityError,
  type RecommendationPriorityCandidateInput,
  type RecommendationSourceRank,
} from "@/lib/recommendation-priority/model";
import { projectRecommendationPriority } from "@/lib/recommendation-priority/projection";
import {
  RecommendationPriorityService,
  type RecommendationPriorityDependencies,
  type RecommendationPriorityRepository,
} from "@/lib/recommendation-priority/service.server";
import type {
  RecommendationPriorityPreferenceRecord,
  RecommendationPriorityRecord,
} from "@/lib/recommendation-priority/types";
import type { RecommendationResolutionRecord } from "@/lib/recommendation-resolution/types";

const run = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  configurationSetId: "sprint03-product-config-1.0.0",
} as AssessmentAnalysisRun;

function definition(
  id: string,
  order: number,
  overrides: Partial<CatalogueDefinition> = {},
): CatalogueDefinition {
  return {
    id,
    version: "1.0.0",
    order,
    title: id,
    impact: "medium",
    effort: "low",
    dedupeGroup: id,
    triggers: { any: [{ opportunity: "governance" }] },
    exclusions: [],
    dependencies: [],
    conflicts: [],
    outcome: `${id} outcome`,
    successMeasures: [`${id} measure`],
    ...overrides,
  };
}

function snapshot(definitions: CatalogueDefinition[]): CatalogueSnapshot {
  return validateCatalogueSnapshot({
    catalogueId: "deliveryiq-recommendations",
    version: "1.0.0",
    sourceConfigurationSetId: run.configurationSetId,
    definitions,
  });
}

function sourceRank(
  recommendationId: string,
  overrides: Partial<RecommendationSourceRank> = {},
): RecommendationSourceRank {
  const values = {
    impact: overrides.impact ?? 60,
    urgency: overrides.urgency ?? 65,
    confidence: overrides.confidence ?? 80,
    effortEase: overrides.effortEase ?? 100,
    dependencyReadiness: overrides.dependencyReadiness ?? 100,
  };
  return {
    recommendationId,
    rankScore: calculateRecommendationRankScore(values).stored,
    impactBand: overrides.impactBand ?? "medium",
    effortBand: overrides.effortBand ?? "low",
    ...values,
  };
}

function candidate(
  item: CatalogueDefinition,
  overrides: Partial<RecommendationPriorityCandidateInput> = {},
): RecommendationPriorityCandidateInput {
  return {
    resolutionCandidateId: `resolution-${item.id}`,
    recommendationDefinitionId: `definition-${item.id}`,
    recommendationId: item.id,
    recommendationVersion: item.version,
    catalogueOrder: item.order,
    postConfidenceResult: "presented",
    sourceRecommendationIds: [item.id],
    sourceTraceNodeIds: [`trace-${item.id}`],
    sourceRanks: [sourceRank(item.id)],
    ...overrides,
  };
}

describe("S4-005 deterministic impact, effort and priority", () => {
  it.each([
    [85, "critical"],
    [84.999999, "high"],
    [70, "high"],
    [69.999999, "medium"],
    [50, "medium"],
    [49.999999, "low"],
    [0, "low"],
  ] as const)("maps the exact %s boundary to %s", (score, label) => {
    expect(recommendationPriorityLabel(score)).toBe(label);
  });

  it("preserves DIQ-203 components, formula and deterministic tie-breakers", () => {
    const first = definition("rec_first", 1);
    const second = definition("rec_second", 2);
    const output = buildRecommendationPriority({
      snapshot: snapshot([first, second]),
      analysisConfidence: 80,
      candidates: [candidate(second), candidate(first)],
    });
    expect(output.items.map((item) => item.recommendationId)).toEqual(["rec_first", "rec_second"]);
    expect(output.items[0]).toMatchObject({
      generatedRank: 1,
      components: {
        impact: 60,
        urgency: 65,
        confidence: 80,
        effortEase: 100,
        dependencyReadiness: 100,
      },
      componentWeights: {
        impact: 0.4,
        urgency: 0.25,
        confidence: 0.15,
        effortEase: 0.1,
        dependencyReadiness: 0.1,
      },
    });
    expect(output.items[0].rationale.map((item) => item.component)).toEqual([
      "impact",
      "urgency",
      "confidence",
      "effort",
      "dependency_readiness",
    ]);
  });

  it("orders by unrounded score when stored six-decimal scores collide", () => {
    const first = definition("rec_first", 1);
    const second = definition("rec_second", 2);
    const firstRank = sourceRank(first.id, { urgency: 80 });
    const secondRank = sourceRank(second.id, { urgency: 80.0000004 });
    expect(firstRank.rankScore).toBe(secondRank.rankScore);
    const output = buildRecommendationPriority({
      snapshot: snapshot([first, second]),
      analysisConfidence: 80,
      candidates: [
        candidate(first, { sourceRanks: [firstRank] }),
        candidate(second, { sourceRanks: [secondRank] }),
      ],
    });
    expect(output.items.map((item) => item.recommendationId)).toEqual(["rec_second", "rec_first"]);
    expect(output.items[0].rawRankScore).toBeGreaterThan(output.items[1].rawRankScore);
  });

  it("aggregates governed dedupe impact and urgency while retaining canonical effort", () => {
    const first = definition("rec_first", 1, { dedupeGroup: "shared", effort: "low" });
    const second = definition("rec_second", 2, { dedupeGroup: "shared", impact: "high" });
    const output = buildRecommendationPriority({
      snapshot: snapshot([first, second]),
      analysisConfidence: 80,
      candidates: [
        candidate(first, {
          sourceRecommendationIds: [first.id, second.id],
          sourceTraceNodeIds: ["trace-first", "trace-second"],
          sourceRanks: [
            sourceRank(first.id),
            sourceRank(second.id, { impact: 90, impactBand: "high", urgency: 100 }),
          ],
        }),
      ],
    });
    expect(output.items[0]).toMatchObject({
      impact: "high",
      effort: "low",
      components: { impact: 90, urgency: 100, effortEase: 100 },
    });
  });

  it("keeps low confidence and dependency readiness visible in the rationale", () => {
    const item = definition("rec_first", 1);
    const output = buildRecommendationPriority({
      snapshot: snapshot([item]),
      analysisConfidence: 49.999999,
      candidates: [
        candidate(item, {
          sourceRanks: [sourceRank(item.id, { confidence: 49.999999, dependencyReadiness: 40 })],
        }),
      ],
    });
    expect(output.items[0].components.dependencyReadiness).toBe(40);
    expect(output.items[0].rationale).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ statement: "Analysis confidence is low." }),
        expect.objectContaining({
          statement: "A required dependency is not yet available in the eligible set.",
        }),
      ]),
    );
  });

  it("fails closed when a stored source rank does not match DIQ-203", () => {
    const item = definition("rec_first", 1);
    expect(() =>
      buildRecommendationPriority({
        snapshot: snapshot([item]),
        analysisConfidence: 80,
        candidates: [candidate(item, { sourceRanks: [{ ...sourceRank(item.id), rankScore: 1 }] })],
      }),
    ).toThrow(RecommendationPriorityError);
  });

  it("prioritises 250 recommendations inside the two-second portfolio budget", () => {
    const definitions = Array.from({ length: 250 }, (_, index) =>
      definition(`rec_performance_${index}`, index + 1),
    );
    const started = performance.now();
    expect(
      buildRecommendationPriority({
        snapshot: snapshot(definitions),
        analysisConfidence: 80,
        candidates: definitions.map((item) => candidate(item)),
      }).items,
    ).toHaveLength(250);
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("applies a display preference without mutating generated rank", () => {
    const first = definition("rec_first", 1);
    const second = definition("rec_second", 2);
    const baseline = buildRecommendationPriority({
      snapshot: snapshot([first, second]),
      analysisConfidence: 80,
      candidates: [candidate(first), candidate(second)],
    }).items;
    const preferred = applyDisplayOrderPreference(baseline, [second.id, first.id]);
    expect(
      preferred.map((item) => [item.recommendationId, item.generatedRank, item.displayRank]),
    ).toEqual([
      [second.id, 2, 1],
      [first.id, 1, 2],
    ]);
    expect(() => applyDisplayOrderPreference(baseline, [first.id, first.id])).toThrow(
      RecommendationPriorityError,
    );
  });
});

const definitions = [definition("rec_first", 1), definition("rec_second", 2)];
const catalogueSnapshot = snapshot(definitions);
const catalogue = {
  id: "44444444-4444-4444-8444-444444444444",
  catalogueId: "deliveryiq-recommendations",
  version: "1.0.0",
  sourceConfigurationSetId: run.configurationSetId,
  contentDigest: "a".repeat(64),
  snapshot: catalogueSnapshot,
  state: "active",
  authoredBy: "55555555-5555-4555-8555-555555555555",
  createdAt: "2026-08-03T00:00:00.000Z",
} satisfies CatalogueVersionRecord;
const gate = {
  id: "66666666-6666-4666-8666-666666666666",
  recommendationEvaluationId: "77777777-7777-4777-8777-777777777777",
  analysisRunId: run.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueId: catalogue.catalogueId,
  catalogueVersion: catalogue.version,
  catalogueDigest: catalogue.contentDigest,
  confidenceIndex: 80,
  outputHash: "b".repeat(64),
  candidates: definitions.map((item, index) => ({
    id: `88888888-8888-4888-8888-88888888888${index}`,
    confidenceGateId: "66666666-6666-4666-8666-666666666666",
    candidateEvaluationId: `evaluation-${index}`,
    recommendationDefinitionId: `definition-${item.id}`,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    recommendationId: item.id,
    recommendationVersion: item.version,
    catalogueOrder: item.order,
    effort: item.effort,
    preGateResult: "eligible" as const,
    postGateResult: "presented" as const,
    reasonCode: "confidence_high" as const,
    confidenceState: "high" as const,
    caveat: null,
    limitationCodes: [],
    sourceTraceNodeIds: [`trace-${item.id}`],
    semanticHash: "c".repeat(64),
  })),
} as RecommendationConfidenceGateRecord;

const resolution = {
  id: "99999999-9999-4999-8999-999999999999",
  analysisRunId: run.id,
  recommendationEvaluationId: gate.recommendationEvaluationId,
  confidenceGateId: gate.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  configurationSetId: run.configurationSetId,
  catalogueVersionId: catalogue.id,
  catalogueId: catalogue.catalogueId,
  catalogueVersion: catalogue.version,
  catalogueDigest: catalogue.contentDigest,
  outputHash: "d".repeat(64),
  candidates: definitions.map((item, index) => ({
    id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
    resolutionId: "99999999-9999-4999-8999-999999999999",
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    candidateConfidenceGateId: gate.candidates[index].id,
    recommendationDefinitionId: `definition-${item.id}`,
    recommendationId: item.id,
    recommendationVersion: item.version,
    catalogueOrder: item.order,
    postConfidenceResult: "presented" as const,
    resolutionResult: "canonical" as const,
    reasonCode: "retained" as const,
    winnerRecommendationId: null,
    winnerRecommendationVersion: null,
    sourceCandidateGateIds: [gate.candidates[index].id],
    sourceTraceNodeIds: [`trace-${item.id}`],
    semanticHash: "e".repeat(64),
  })),
} as RecommendationResolutionRecord;

const result = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  analysisRunId: run.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  resultHash: "f".repeat(64),
  canonicalResult: {
    recommendations: {
      ranked: definitions.map((item) => {
        const rank = sourceRank(item.id);
        return {
          id: item.id,
          rankScore: rank.rankScore,
          impact: rank.impactBand,
          effort: rank.effortBand,
          impactValue: rank.impact,
          urgency: rank.urgency,
          effortEase: rank.effortEase,
          dependencyReadiness: rank.dependencyReadiness,
        };
      }),
    },
  },
} as StoredIntelligenceResult;

function storedPriority(preference: RecommendationPriorityPreferenceRecord | null = null) {
  const output = buildRecommendationPriority({
    snapshot: catalogueSnapshot,
    analysisConfidence: gate.confidenceIndex,
    candidates: definitions.map((item, index) =>
      candidate(item, {
        resolutionCandidateId: resolution.candidates[index].id,
        sourceRecommendationIds: [item.id],
        sourceTraceNodeIds: [`trace-${item.id}`],
      }),
    ),
  });
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    analysisRunId: run.id,
    intelligenceResultId: result.id,
    recommendationEvaluationId: gate.recommendationEvaluationId,
    confidenceGateId: gate.id,
    conflictResolutionId: resolution.id,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    configurationSetId: run.configurationSetId,
    catalogueVersionId: catalogue.id,
    catalogueId: catalogue.catalogueId,
    catalogueVersion: catalogue.version,
    catalogueDigest: catalogue.contentDigest,
    policyVersion: output.policyVersion,
    modelVersion: output.modelVersion,
    inputHash: "1".repeat(64),
    outputHash: "2".repeat(64),
    canonicalInput: {} as RecommendationPriorityRecord["canonicalInput"],
    canonicalPriority: output,
    items: output.items.map((item, index) => ({
      ...item,
      id: `priority-item-${index}`,
      priorityModelId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "3".repeat(64),
    })),
    preference,
    createdAt: "2026-08-03T00:01:00.000Z",
  } satisfies RecommendationPriorityRecord;
}

function serviceHarness(existing: RecommendationPriorityRecord | null = null) {
  let published: Record<string, unknown> | null = null;
  const repo: RecommendationPriorityRepository = {
    getPriorityModel: vi.fn(async () => existing),
    getPriorityModelForRun: vi.fn(async () => existing),
    publishPriorityModel: vi.fn(async (input) => {
      published = input;
      return storedPriority();
    }),
    setDisplayPreference: vi.fn(async () => ({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      priorityModelId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      version: 1,
      previousPreferenceId: null,
      orderedRecommendationIds: ["rec_second", "rec_first"],
      actorUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      idempotencyKey: "priority-preference-0001",
      createdAt: "2026-08-03T00:02:00.000Z",
    })),
  };
  const deps: RecommendationPriorityDependencies = {
    getResolutionForRun: vi.fn(async () => resolution),
    getConfidenceGateForRun: vi.fn(async () => gate),
    getResult: vi.fn(async () => result),
    getCatalogueVersion: vi.fn(async () => catalogue),
  };
  return {
    service: new RecommendationPriorityService(repo, deps),
    repo,
    deps,
    published: () => published,
  };
}

describe("S4-005 persistence, isolation, overlays and disclosure", () => {
  it("publishes one immutable tenant-scoped model and reuses an identical replay", async () => {
    const first = serviceHarness();
    await expect(first.service.prioritise(run)).resolves.toMatchObject({ reused: false });
    expect(first.published()).toMatchObject({
      analysis_run_id: run.id,
      conflict_resolution_id: resolution.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      policy_version: "PB-004/S4-005/1.0.0",
    });
    const existing = storedPriority();
    const replay = serviceHarness(existing);
    await expect(replay.service.prioritise(run)).resolves.toEqual({
      priority: existing,
      reused: true,
    });
    expect(replay.repo.publishPriorityModel).not.toHaveBeenCalled();
  });

  it("fails closed on a cross-tenant resolution", async () => {
    const { service, deps, repo } = serviceHarness();
    vi.mocked(deps.getResolutionForRun).mockResolvedValue({
      ...resolution,
      organisationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    });
    await expect(service.prioritise(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_PRIORITY_INVALID",
      status: 422,
    });
    expect(repo.publishPriorityModel).not.toHaveBeenCalled();
  });

  it("records an append-only customer preference without changing the baseline", async () => {
    const baseline = storedPriority();
    const { service, repo } = serviceHarness(baseline);
    const response = await service.setDisplayPreference(run, {
      orderedRecommendationIds: ["rec_second", "rec_first"],
      expectedVersion: 0,
      idempotencyKey: "priority-preference-0001",
      actorUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });
    expect(repo.setDisplayPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        priority_model_id: baseline.id,
        expected_version: 0,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
      }),
    );
    expect(response.priority.items.map((item) => item.generatedRank)).toEqual([1, 2]);
    expect(response.preference.version).toBe(1);
  });

  it("redacts numeric scores, weights, traces and actors from customer and public projections", () => {
    const preference = {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      priorityModelId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      version: 1,
      previousPreferenceId: null,
      orderedRecommendationIds: ["rec_second", "rec_first"],
      actorUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      idempotencyKey: "priority-preference-0001",
      createdAt: "2026-08-03T00:02:00.000Z",
    } satisfies RecommendationPriorityPreferenceRecord;
    const record = storedPriority(preference);
    const workspace = JSON.stringify(projectRecommendationPriority(record, "workspace"));
    const audit = JSON.stringify(projectRecommendationPriority(record, "audit"));
    const publicProjection = JSON.stringify(projectRecommendationPriority(record, "public"));
    expect(workspace).not.toContain("rawRankScore");
    expect(workspace).not.toContain("componentWeights");
    expect(workspace).not.toContain("sourceTraceNodeIds");
    expect(workspace).not.toContain(preference.actorUserId);
    expect(workspace.indexOf("rec_second")).toBeLessThan(workspace.indexOf("rec_first"));
    expect(audit).toContain("rawRankScore");
    expect(audit).toContain(preference.actorUserId);
    expect(publicProjection).not.toContain(run.id);
    expect(publicProjection).not.toContain("rec_first");
    expect(publicProjection).not.toContain("rawRankScore");
    expect(publicProjection).not.toContain("critical");
  });
});
