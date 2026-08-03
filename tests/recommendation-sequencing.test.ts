import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import type { CatalogueVersionRecord } from "@/lib/recommendation-catalogue/types";
import {
  applySequenceOverride,
  buildRecommendationSequence,
  RecommendationSequenceCycleError,
  sequenceOverrideRisks,
  type RecommendationDependencyInput,
  type RecommendationSequenceCandidateInput,
} from "@/lib/recommendation-sequencing/model";
import { projectRecommendationSequence } from "@/lib/recommendation-sequencing/projection";
import {
  RecommendationSequenceService,
  type RecommendationSequenceDependencies,
  type RecommendationSequenceRepository,
} from "@/lib/recommendation-sequencing/service.server";
import type { RecommendationSequenceRecord } from "@/lib/recommendation-sequencing/types";
import type { RecommendationPriorityRecord } from "@/lib/recommendation-priority/types";
import type { RecommendationResolutionRecord } from "@/lib/recommendation-resolution/types";

const run = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  configurationSetId: "sprint03-product-config-1.0.0",
} as AssessmentAnalysisRun;

function dependency(
  sourceDependencyId: string,
  dependencyType: "required" | "recommended" = "required",
  overrides: Partial<RecommendationDependencyInput> = {},
): RecommendationDependencyInput {
  return {
    sourceDependencyId,
    resolvedDependencyId: sourceDependencyId,
    dependencyType,
    resolution: "direct",
    ...overrides,
  };
}

function candidate(
  recommendationId: string,
  generatedRank: number,
  dependencies: RecommendationDependencyInput[] = [],
  effort: "low" | "medium" | "high" = "low",
): RecommendationSequenceCandidateInput {
  return {
    priorityItemId: `priority-${recommendationId}`,
    recommendationId,
    recommendationVersion: "1.0.0",
    catalogueOrder: generatedRank,
    generatedRank,
    effort,
    sourceTraceNodeIds: [`trace-${recommendationId}`],
    dependencies,
  };
}

describe("S4-006 dependency and sequencing model", () => {
  it("preserves the locked DIQ-203B dependency roadmap fixture", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("rec_integrated_controls", 1, [dependency("rec_decision_rights")], "high"),
        candidate("rec_decision_rights", 2, [], "medium"),
        candidate("rec_delivery_insight", 3),
        candidate("rec_improvement_cadence", 4, [dependency("rec_delivery_insight")]),
      ],
    });
    const projection = (horizon: "day30" | "day60" | "day90") =>
      output.items
        .filter((item) => item.generatedHorizon === horizon)
        .sort((left, right) => left.generatedSequence! - right.generatedSequence!)
        .map((item) => ({ id: item.recommendationId, reason: item.reasonCode }));
    expect({
      day30: projection("day30"),
      day60: projection("day60"),
      day90: projection("day90"),
      unscheduled: output.items
        .filter((item) => item.generatedSequence === null)
        .map((item) => ({ id: item.recommendationId, reason: item.reasonCode })),
    }).toEqual({
      day30: [
        { id: "rec_decision_rights", reason: "dependency_precedence" },
        { id: "rec_delivery_insight", reason: "rank_and_horizon_fit" },
      ],
      day60: [
        { id: "rec_integrated_controls", reason: "dependency_satisfied" },
        { id: "rec_improvement_cadence", reason: "dependency_satisfied" },
      ],
      day90: [],
      unscheduled: [],
    });
  });

  it("places a required dependency before its higher-ranked dependant", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("dependant", 1, [dependency("foundation")]),
        candidate("foundation", 2),
      ],
    });
    expect(
      output.items
        .filter((item) => item.generatedSequence !== null)
        .sort((left, right) => left.generatedSequence! - right.generatedSequence!)
        .map((item) => item.recommendationId),
    ).toEqual(["foundation", "dependant"]);
    expect(output.items.find((item) => item.recommendationId === "foundation")).toMatchObject({
      generatedHorizon: "day30",
      reasonCode: "dependency_precedence",
    });
  });

  it("applies the locked 3/3/4 horizon capacity without changing generated rank", () => {
    const output = buildRecommendationSequence({
      candidates: Array.from({ length: 12 }, (_, index) =>
        candidate(`recommendation-${index + 1}`, index + 1),
      ),
    });
    expect(output.capacity).toEqual({ day30: 3, day60: 3, day90: 4 });
    expect(output.items.filter((item) => item.generatedHorizon === "day30")).toHaveLength(3);
    expect(output.items.filter((item) => item.generatedHorizon === "day60")).toHaveLength(3);
    expect(output.items.filter((item) => item.generatedHorizon === "day90")).toHaveLength(4);
    expect(output.items.filter((item) => item.sequenceState === "capacity_exceeded")).toHaveLength(
      2,
    );
    expect(output.items.map((item) => item.generatedRank)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
  });

  it("blocks missing required dependencies and preserves the governed reason", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("blocked", 1, [
          dependency("not-eligible", "required", {
            resolvedDependencyId: null,
            resolution: "unavailable",
          }),
        ]),
      ],
    });
    expect(output.items[0]).toMatchObject({
      generatedSequence: null,
      generatedHorizon: null,
      sequenceState: "blocked_dependency",
      reasonCode: "blocked_dependency",
      blockingDependencyIds: ["not-eligible"],
    });
    expect(output.dependencies[0]).toMatchObject({
      dependencyType: "required",
      state: "unavailable",
      reasonCode: "dependency_unavailable",
    });
  });

  it("keeps a recommendation schedulable when only a recommended dependency is unavailable", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("advisory", 1, [
          dependency("optional-foundation", "recommended", {
            resolvedDependencyId: null,
            resolution: "unavailable",
          }),
        ]),
      ],
    });
    expect(output.items[0]).toMatchObject({
      sequenceState: "scheduled",
      caveats: [
        {
          code: "recommended_dependency_unavailable",
          dependencyId: "optional-foundation",
        },
      ],
    });
  });

  it("resolves a superseded dependency to its governed canonical winner", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("dependant", 1, [
          dependency("legacy-foundation", "required", {
            resolvedDependencyId: "foundation",
            resolution: "superseded",
          }),
        ]),
        candidate("foundation", 2),
      ],
    });
    expect(output.dependencies[0]).toMatchObject({
      sourceDependencyId: "legacy-foundation",
      resolvedDependencyId: "foundation",
      resolution: "superseded",
      state: "available",
      reasonCode: "dependency_superseded",
    });
    expect(output.items.find((item) => item.recommendationId === "dependant")).toMatchObject({
      sequenceState: "scheduled",
    });
  });

  it("propagates a required dependency block without blocking recommended dependants", () => {
    const output = buildRecommendationSequence({
      candidates: [
        candidate("foundation", 1, [
          dependency("missing", "required", {
            resolvedDependencyId: null,
            resolution: "unavailable",
          }),
        ]),
        candidate("required-dependant", 2, [dependency("foundation")]),
        candidate("recommended-dependant", 3, [dependency("foundation", "recommended")]),
      ],
    });
    expect(
      output.items.find((item) => item.recommendationId === "required-dependant"),
    ).toMatchObject({ sequenceState: "blocked_dependency", blockingDependencyIds: ["foundation"] });
    expect(
      output.items.find((item) => item.recommendationId === "recommended-dependant"),
    ).toMatchObject({
      sequenceState: "scheduled",
      caveats: [{ code: "recommended_dependency_blocked", dependencyId: "foundation" }],
    });
  });

  it("fails closed with the locked cycle error and deterministic cycle evidence", () => {
    expect(() =>
      buildRecommendationSequence({
        candidates: [
          candidate("first", 1, [dependency("second")]),
          candidate("second", 2, [dependency("first")]),
        ],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<RecommendationSequenceCycleError>>({
        code: "ROADMAP_DEPENDENCY_CYCLE",
        cycle: ["first", "second", "first"],
      }),
    );
  });

  it("sequences a 250-node graph with up to 1,000 edges inside both performance budgets", () => {
    const started = performance.now();
    const output = buildRecommendationSequence({
      candidates: Array.from({ length: 250 }, (_, index) =>
        candidate(
          `recommendation-${index + 1}`,
          index + 1,
          Array.from({ length: Math.min(index, 4) }, (_, dependencyOffset) =>
            dependency(`recommendation-${index - dependencyOffset}`),
          ),
        ),
      ),
    });
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(1_000);
    expect(elapsed).toBeLessThan(2_000);
    expect(output.items).toHaveLength(250);
    expect(output.items.filter((item) => item.sequenceState === "scheduled")).toHaveLength(10);
    expect(output.items.filter((item) => item.sequenceState === "capacity_exceeded")).toHaveLength(
      1,
    );
    expect(output.items.filter((item) => item.sequenceState === "blocked_dependency")).toHaveLength(
      239,
    );
  });

  it("rejects unbounded portfolio and dependency traversal", () => {
    expect(() =>
      buildRecommendationSequence({
        candidates: Array.from({ length: 251 }, (_, index) =>
          candidate(`recommendation-${index + 1}`, index + 1),
        ),
      }),
    ).toThrow("limited to 250 recommendations and 1,000 dependencies");

    const candidates = Array.from({ length: 250 }, (_, index) =>
      candidate(`recommendation-${index + 1}`, index + 1),
    );
    candidates[249].dependencies = Array.from({ length: 1_001 }, (_, index) =>
      dependency(`external-${index}`, "recommended", {
        resolvedDependencyId: null,
        resolution: "unavailable",
      }),
    );
    expect(() => buildRecommendationSequence({ candidates })).toThrow(
      "limited to 250 recommendations and 1,000 dependencies",
    );
  });
});

describe("S4-006 customer overlay and disclosure", () => {
  const output = buildRecommendationSequence({
    candidates: [candidate("dependant", 1, [dependency("foundation")]), candidate("foundation", 2)],
  });

  it("records dependency risks while leaving the generated baseline unchanged", () => {
    const before = structuredClone(output.items);
    expect(
      sequenceOverrideRisks(output.items, output.dependencies, ["dependant", "foundation"]),
    ).toEqual([
      {
        dependantRecommendationId: "dependant",
        dependencyRecommendationId: "foundation",
        dependencyType: "required",
      },
    ]);
    const applied = applySequenceOverride(output.items, output.dependencies, [
      "dependant",
      "foundation",
    ]);
    expect(applied.find((item) => item.recommendationId === "dependant")).toMatchObject({
      generatedSequence: 2,
      customerSequence: 1,
    });
    expect(output.items).toEqual(before);
  });

  it("rejects incomplete and duplicate customer sequences", () => {
    expect(() => sequenceOverrideRisks(output.items, output.dependencies, ["foundation"])).toThrow(
      "must contain every scheduled recommendation exactly once",
    );
    expect(() =>
      sequenceOverrideRisks(output.items, output.dependencies, ["foundation", "foundation"]),
    ).toThrow("must contain every scheduled recommendation exactly once");
  });

  it("uses deny-by-default public projection and progressively discloses workspace audit detail", () => {
    const record = storedSequence(output);
    const publicProjection = projectRecommendationSequence(record, "public");
    const workspace = projectRecommendationSequence(record, "workspace");
    const audit = projectRecommendationSequence(record, "audit");
    expect(publicProjection).toEqual({ recommendationCount: 2 });
    expect(JSON.stringify(publicProjection)).not.toContain("foundation");
    expect(workspace.recommendations[0]).toHaveProperty("dependencies");
    expect(workspace).not.toHaveProperty("organisationId");
    expect(audit).toMatchObject({
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      inputHash: "a".repeat(64),
    });
    expect(audit.recommendations[0]).toHaveProperty("semanticHash");
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
        triggers: { any: [{ opportunity: "flow" }] },
        exclusions: [],
        dependencies: ["foundation"],
        conflicts: [],
        outcome: "Dependant outcome",
        successMeasures: ["Dependant measure"],
      },
    ],
  },
} satisfies CatalogueVersionRecord;

const priority = {
  id: "66666666-6666-4666-8666-666666666666",
  analysisRunId: run.id,
  conflictResolutionId: "77777777-7777-4777-8777-777777777777",
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
      recommendationId: "foundation",
      recommendationVersion: "1.0.0",
      catalogueOrder: 1,
      generatedRank: 2,
      effort: "low",
      sourceTraceNodeIds: ["trace-foundation"],
    },
    {
      id: "priority-dependant",
      recommendationId: "dependant",
      recommendationVersion: "1.0.0",
      catalogueOrder: 2,
      generatedRank: 1,
      effort: "medium",
      sourceTraceNodeIds: ["trace-dependant"],
    },
  ],
} as RecommendationPriorityRecord;

const resolution = {
  id: priority.conflictResolutionId,
  analysisRunId: run.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  catalogueVersionId: catalogue.id,
  candidates: [
    {
      recommendationId: "foundation",
      resolutionResult: "canonical",
      reasonCode: "retained",
      winnerRecommendationId: null,
    },
    {
      recommendationId: "dependant",
      resolutionResult: "canonical",
      reasonCode: "retained",
      winnerRecommendationId: null,
    },
  ],
} as RecommendationResolutionRecord;

function storedSequence(
  output = buildRecommendationSequence({
    candidates: [
      candidate("dependant", 1, [dependency("foundation")], "medium"),
      candidate("foundation", 2),
    ],
  }),
): RecommendationSequenceRecord {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    analysisRunId: run.id,
    priorityModelId: priority.id,
    conflictResolutionId: resolution.id,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    configurationSetId: run.configurationSetId,
    catalogueVersionId: catalogue.id,
    catalogueId: catalogue.catalogueId,
    catalogueVersion: catalogue.version,
    catalogueDigest: catalogue.contentDigest,
    policyVersion: output.policyVersion,
    engineVersion: output.engineVersion,
    inputHash: "a".repeat(64),
    outputHash: "b".repeat(64),
    canonicalInput: {} as RecommendationSequenceRecord["canonicalInput"],
    canonicalSequence: output,
    items: output.items.map((item, index) => ({
      ...item,
      id: `sequence-item-${index}`,
      sequenceModelId: "88888888-8888-4888-8888-888888888888",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "e".repeat(64),
    })),
    dependencies: output.dependencies.map((item, index) => ({
      ...item,
      id: `sequence-dependency-${index}`,
      sequenceModelId: "88888888-8888-4888-8888-888888888888",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "f".repeat(64),
    })),
    override: null,
    createdAt: "2026-08-03T00:01:00.000Z",
  };
}

function serviceHarness(existing: RecommendationSequenceRecord | null = null) {
  let published: Record<string, unknown> | null = null;
  const repo: RecommendationSequenceRepository = {
    getSequenceModel: vi.fn(async () => existing),
    getSequenceModelForRun: vi.fn(async () => existing),
    getDependencyMappings: vi.fn(async () => [
      {
        recommendationId: "dependant",
        dependencyId: "foundation",
        dependencyType: "required",
      },
    ]),
    publishSequenceModel: vi.fn(async (input) => {
      published = input;
      return storedSequence();
    }),
    setSequenceOverride: vi.fn(async () => ({
      id: "99999999-9999-4999-8999-999999999999",
      sequenceModelId: "88888888-8888-4888-8888-888888888888",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      version: 1,
      previousOverrideId: null,
      orderedRecommendationIds: ["dependant", "foundation"],
      reason: "Customer sequencing constraint",
      acknowledgedRisk: true,
      dependencyRisks: [],
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      idempotencyKey: "sequence-override-0001",
      createdAt: "2026-08-03T00:02:00.000Z",
    })),
  };
  const deps: RecommendationSequenceDependencies = {
    getPriorityModelForRun: vi.fn(async () => priority),
    getResolutionForRun: vi.fn(async () => resolution),
    getCatalogueVersion: vi.fn(async () => catalogue),
  };
  return {
    service: new RecommendationSequenceService(repo, deps),
    repo,
    deps,
    published: () => published,
  };
}

describe("S4-006 governed service and tenant isolation", () => {
  it("publishes once with pinned lineage and reuses the immutable model", async () => {
    const first = serviceHarness();
    await expect(first.service.sequence(run)).resolves.toMatchObject({ reused: false });
    expect(first.published()).toMatchObject({
      analysis_run_id: run.id,
      priority_model_id: priority.id,
      conflict_resolution_id: resolution.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      policy_version: "PB-004/S4-006/1.0.0",
    });
    const existing = storedSequence();
    const replay = serviceHarness(existing);
    await expect(replay.service.sequence(run)).resolves.toEqual({
      sequence: existing,
      reused: true,
    });
    expect(replay.repo.publishSequenceModel).not.toHaveBeenCalled();
  });

  it("fails closed before publication when pinned tenant scope differs", async () => {
    const { service, deps, repo } = serviceHarness();
    vi.mocked(deps.getPriorityModelForRun).mockResolvedValue({
      ...priority,
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    await expect(service.sequence(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_SEQUENCE_INVALID",
      status: 422,
    });
    expect(repo.publishSequenceModel).not.toHaveBeenCalled();
  });

  it("requires an explicit reason, risk acknowledgement and concurrency version for overrides", async () => {
    const { service, repo } = serviceHarness(storedSequence());
    await expect(
      service.setOverride(run, {
        orderedRecommendationIds: ["dependant", "foundation"],
        expectedVersion: 0,
        idempotencyKey: "sequence-override-0001",
        reason: " ",
        acknowledgedRisk: true,
        actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.setSequenceOverride).not.toHaveBeenCalled();
  });

  it("computes dependency risks server-side for the append-only override", async () => {
    const { service, repo } = serviceHarness(storedSequence());
    await service.setOverride(run, {
      orderedRecommendationIds: ["dependant", "foundation"],
      expectedVersion: 0,
      idempotencyKey: "sequence-override-0001",
      reason: "Customer sequencing constraint",
      acknowledgedRisk: true,
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(repo.setSequenceOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        expected_version: 0,
        acknowledged_risk: true,
        dependency_risks: [
          {
            dependantRecommendationId: "dependant",
            dependencyRecommendationId: "foundation",
            dependencyType: "required",
          },
        ],
      }),
    );
  });
});
