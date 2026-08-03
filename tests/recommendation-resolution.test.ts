import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import {
  sprint03CatalogueSnapshot,
  validateCatalogueSnapshot,
} from "@/lib/recommendation-catalogue/catalogue";
import type {
  CatalogueDefinition,
  CatalogueSnapshot,
  CatalogueVersionRecord,
} from "@/lib/recommendation-catalogue/types";
import type { RecommendationConfidenceGateRecord } from "@/lib/recommendation-confidence/types";
import { projectRecommendationResolution } from "@/lib/recommendation-resolution/projection";
import {
  resolveRecommendationConflicts,
  RecommendationResolutionError,
  type RecommendationResolutionCandidateInput,
} from "@/lib/recommendation-resolution/resolver";
import {
  RecommendationResolutionService,
  type RecommendationResolutionDependencies,
  type RecommendationResolutionRepository,
} from "@/lib/recommendation-resolution/service.server";
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
    triggers: { any: [{ analysisConfidence: "low" }] },
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

function candidate(
  item: CatalogueDefinition,
  traceSuffix = item.order,
): RecommendationResolutionCandidateInput {
  return {
    candidateConfidenceGateId: `candidate-${item.id}`,
    recommendationDefinitionId: `definition-${item.id}`,
    recommendationId: item.id,
    recommendationVersion: item.version,
    catalogueOrder: item.order,
    postConfidenceResult: "presented",
    sourceTraceNodeIds: [`trace-${traceSuffix}`],
  };
}

describe("S4-004 deterministic conflict resolution", () => {
  it("leaves the locked production catalogue unchanged when no conflict is configured", () => {
    const catalogue = sprint03CatalogueSnapshot();
    const definitions = catalogue.definitions.slice(0, 3);
    const output = resolveRecommendationConflicts({
      snapshot: catalogue,
      candidates: definitions.map((item) => candidate(item)),
    });
    expect(output.candidates).toHaveLength(3);
    expect(output.candidates.every((item) => item.resolutionResult === "canonical")).toBe(true);
    expect(output.candidates.every((item) => item.reasonCode === "retained")).toBe(true);
  });

  it("deduplicates into the lowest catalogue-order item and aggregates all evidence", () => {
    const first = definition("rec_first", 1, { dedupeGroup: "shared" });
    const second = definition("rec_second", 2, { dedupeGroup: "shared" });
    const output = resolveRecommendationConflicts({
      snapshot: snapshot([first, second]),
      candidates: [candidate(second, 2), candidate(first, 1)],
    });
    expect(output.candidates[0]).toMatchObject({
      recommendationId: first.id,
      resolutionResult: "canonical",
      sourceCandidateGateIds: ["candidate-rec_first", "candidate-rec_second"],
      sourceTraceNodeIds: ["trace-1", "trace-2"],
    });
    expect(output.candidates[1]).toMatchObject({
      recommendationId: second.id,
      resolutionResult: "suppressed",
      reasonCode: "deduplicated",
      winnerRecommendationId: first.id,
    });
  });

  it("honours a governed versioned canonical recommendation", () => {
    const canonical = { id: "rec_second", version: "1.0.0" };
    const first = definition("rec_first", 1, {
      dedupeGroup: "shared",
      canonicalRecommendation: canonical,
    });
    const second = definition("rec_second", 2, {
      dedupeGroup: "shared",
      canonicalRecommendation: canonical,
    });
    const output = resolveRecommendationConflicts({
      snapshot: snapshot([first, second]),
      candidates: [candidate(first), candidate(second)],
    });
    expect(output.candidates.find((item) => item.recommendationId === first.id)).toMatchObject({
      resolutionResult: "suppressed",
      winnerRecommendationId: second.id,
    });
  });

  it("resolves mutual exclusions by priority, then catalogue order and ID", () => {
    const first = definition("rec_first", 1, {
      conflicts: ["rec_second"],
      conflictPriority: 10,
    });
    const second = definition("rec_second", 2, {
      conflicts: ["rec_first"],
      conflictPriority: 20,
    });
    const output = resolveRecommendationConflicts({
      snapshot: snapshot([first, second]),
      candidates: [candidate(first), candidate(second)],
    });
    expect(output.candidates.find((item) => item.recommendationId === first.id)).toMatchObject({
      resolutionResult: "suppressed",
      reasonCode: "mutual_exclusion",
      winnerRecommendationId: second.id,
    });

    const tiedFirst = { ...first, conflictPriority: 20 };
    const tied = resolveRecommendationConflicts({
      snapshot: snapshot([tiedFirst, second]),
      candidates: [candidate(second), candidate(tiedFirst)],
    });
    expect(tied.candidates.find((item) => item.recommendationId === second.id)).toMatchObject({
      resolutionResult: "suppressed",
      winnerRecommendationId: first.id,
    });
  });

  it("resolves a supersession chain to its active root", () => {
    const first = definition("rec_first", 1, {
      supersedes: [{ id: "rec_second", version: "1.0.0" }],
    });
    const second = definition("rec_second", 2, {
      supersedes: [{ id: "rec_third", version: "1.0.0" }],
    });
    const third = definition("rec_third", 3);
    const output = resolveRecommendationConflicts({
      snapshot: snapshot([first, second, third]),
      candidates: [candidate(third), candidate(second), candidate(first)],
    });
    expect(output.candidates.filter((item) => item.resolutionResult === "canonical")).toHaveLength(
      1,
    );
    expect(output.candidates.filter((item) => item.resolutionResult === "suppressed")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recommendationId: second.id, winnerRecommendationId: first.id }),
        expect.objectContaining({ recommendationId: third.id, winnerRecommendationId: second.id }),
      ]),
    );
  });

  it("fails closed when a winner would suppress its dependency", () => {
    const first = definition("rec_first", 1, {
      dedupeGroup: "shared",
      dependencies: ["rec_second"],
    });
    const second = definition("rec_second", 2, { dedupeGroup: "shared" });
    expect(() => snapshot([first, second])).toThrow("cannot deduplicate its dependency");
  });

  it("is stable under candidate input order", () => {
    const definitions = [
      definition("rec_first", 1, { dedupeGroup: "shared" }),
      definition("rec_second", 2, { dedupeGroup: "shared" }),
      definition("rec_third", 3),
    ];
    const catalogue = snapshot(definitions);
    const forward = resolveRecommendationConflicts({
      snapshot: catalogue,
      candidates: definitions.map((item) => candidate(item)),
    });
    const reverse = resolveRecommendationConflicts({
      snapshot: catalogue,
      candidates: [...definitions].reverse().map((item) => candidate(item)),
    });
    expect(reverse).toEqual(forward);
  });

  it.each([
    () =>
      snapshot([
        definition("rec_first", 1, { conflicts: ["rec_second"], conflictPriority: 1 }),
        definition("rec_second", 2),
      ]),
    () =>
      snapshot([
        definition("rec_first", 1, { conflicts: ["rec_second"] }),
        definition("rec_second", 2, { conflicts: ["rec_first"], conflictPriority: 1 }),
      ]),
    () =>
      snapshot([
        definition("rec_first", 1, {
          supersedes: [{ id: "rec_second", version: "1.0.0" }],
        }),
        definition("rec_second", 2, {
          supersedes: [{ id: "rec_first", version: "1.0.0" }],
        }),
      ]),
  ])("rejects an invalid governed conflict graph", (invalid) => {
    expect(invalid).toThrow();
  });

  it("resolves 1,000 candidates within the one-second engine guard", () => {
    const definitions = Array.from({ length: 1_000 }, (_, index) =>
      definition(`rec_performance_${index}`, index + 1),
    );
    const started = performance.now();
    expect(
      resolveRecommendationConflicts({
        snapshot: snapshot(definitions),
        candidates: definitions.map((item) => candidate(item)),
      }).candidates,
    ).toHaveLength(1_000);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

const serviceDefinitions = [
  definition("rec_first", 1, { dedupeGroup: "shared" }),
  definition("rec_second", 2, { dedupeGroup: "shared" }),
];
const serviceSnapshot = snapshot(serviceDefinitions);
const catalogue = {
  id: "44444444-4444-4444-8444-444444444444",
  catalogueId: "deliveryiq-recommendations",
  version: "1.0.0",
  sourceConfigurationSetId: run.configurationSetId,
  contentDigest: "a".repeat(64),
  snapshot: serviceSnapshot,
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
  outputHash: "b".repeat(64),
  candidates: serviceDefinitions.map((item, index) => ({
    ...candidate(item),
    id: `candidate-${index}`,
    confidenceGateId: "66666666-6666-4666-8666-666666666666",
    candidateEvaluationId: `evaluation-candidate-${index}`,
    recommendationDefinitionId: `definition-${item.id}`,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    effort: "low" as const,
    preGateResult: "eligible" as const,
    postGateResult: "presented" as const,
    reasonCode: "confidence_high" as const,
    confidenceState: "high" as const,
    caveat: null,
    limitationCodes: [],
    semanticHash: "c".repeat(64),
  })),
} as RecommendationConfidenceGateRecord;

function storedResolution(): RecommendationResolutionRecord {
  const output = resolveRecommendationConflicts({
    snapshot: serviceSnapshot,
    candidates: gate.candidates.map((item) => ({
      candidateConfidenceGateId: item.id,
      recommendationDefinitionId: item.recommendationDefinitionId,
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      catalogueOrder: item.catalogueOrder,
      postConfidenceResult: "presented",
      sourceTraceNodeIds: item.sourceTraceNodeIds,
    })),
  });
  return {
    id: "88888888-8888-4888-8888-888888888888",
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
    policyVersion: output.policyVersion,
    resolverVersion: output.resolverVersion,
    inputHash: "d".repeat(64),
    outputHash: "e".repeat(64),
    canonicalInput: {} as RecommendationResolutionRecord["canonicalInput"],
    canonicalResolution: output,
    candidates: output.candidates.map((item, index) => ({
      ...item,
      id: `resolution-candidate-${index}`,
      resolutionId: "88888888-8888-4888-8888-888888888888",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "f".repeat(64),
    })),
    createdAt: "2026-08-03T00:01:00.000Z",
  };
}

function serviceHarness(existing: RecommendationResolutionRecord | null = null) {
  let published: Record<string, unknown> | null = null;
  const repo: RecommendationResolutionRepository = {
    getResolution: vi.fn(async () => existing),
    getResolutionForRun: vi.fn(async () => existing),
    publishResolution: vi.fn(async (input) => {
      published = input;
      return storedResolution();
    }),
  };
  const deps: RecommendationResolutionDependencies = {
    getConfidenceGateForRun: vi.fn(async () => gate),
    getCatalogueVersion: vi.fn(async () => catalogue),
  };
  return {
    service: new RecommendationResolutionService(repo, deps),
    repo,
    deps,
    published: () => published,
  };
}

describe("S4-004 persistence, isolation and projections", () => {
  it("publishes an immutable tenant-scoped resolution and reuses an identical replay", async () => {
    const first = serviceHarness();
    await expect(first.service.resolve(run)).resolves.toMatchObject({ reused: false });
    expect(first.published()).toMatchObject({
      analysis_run_id: run.id,
      confidence_gate_id: gate.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      policy_version: "PB-004/S4-004/1.0.0",
    });

    const existing = storedResolution();
    const replay = serviceHarness(existing);
    await expect(replay.service.resolve(run)).resolves.toEqual({
      resolution: existing,
      reused: true,
    });
    expect(replay.repo.publishResolution).not.toHaveBeenCalled();
  });

  it("fails closed on a cross-tenant confidence gate", async () => {
    const { service, deps, repo } = serviceHarness();
    vi.mocked(deps.getConfidenceGateForRun).mockResolvedValue({
      ...gate,
      organisationId: "99999999-9999-4999-8999-999999999999",
    });
    await expect(service.resolve(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_RESOLUTION_INVALID",
      status: 422,
    });
    expect(repo.publishResolution).not.toHaveBeenCalled();
  });

  it("shows customers only canonical items while retaining suppressed audit evidence", () => {
    const record = storedResolution();
    const workspace = projectRecommendationResolution(record, "workspace");
    const audit = projectRecommendationResolution(record, "audit");
    const publicProjection = projectRecommendationResolution(record, "public");
    expect(JSON.stringify(workspace)).not.toContain("rec_second");
    expect(JSON.stringify(workspace)).not.toContain("sourceTraceNodeIds");
    expect(JSON.stringify(publicProjection)).not.toContain(run.id);
    expect(JSON.stringify(audit)).toContain("rec_second");
    expect(JSON.stringify(audit)).toContain("deduplicated");
  });
});
