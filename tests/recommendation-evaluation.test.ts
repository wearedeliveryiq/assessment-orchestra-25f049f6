import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import { sprint03CatalogueSnapshot } from "@/lib/recommendation-catalogue/catalogue";
import type { CatalogueVersionRecord } from "@/lib/recommendation-catalogue/types";
import { evaluatePinnedCatalogue } from "@/lib/recommendation-evaluation/evaluator";
import {
  canViewRecommendationEvaluationAudit,
  projectRecommendationEvaluation,
} from "@/lib/recommendation-evaluation/projection";
import {
  RecommendationEvaluationService,
  type RecommendationEvaluationDependencies,
  type RecommendationEvaluationRepository,
} from "@/lib/recommendation-evaluation/service.server";
import type { RecommendationEvaluationRecord } from "@/lib/recommendation-evaluation/types";
import {
  evaluateRecommendationCandidates,
  recommendationConfidenceState,
  RecommendationEvaluationError,
} from "@/lib/recommendations/eligibility";

const run = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  configurationSetId: "sprint03-product-config-1.0.0",
} as AssessmentAnalysisRun;

const catalogue = {
  id: "44444444-4444-4444-8444-444444444444",
  catalogueId: "deliveryiq-recommendations",
  version: "1.0.0",
  sourceConfigurationSetId: "sprint03-product-config-1.0.0",
  contentDigest: "a".repeat(64),
  snapshot: sprint03CatalogueSnapshot(),
  state: "active",
  authoredBy: "55555555-5555-4555-8555-555555555555",
  createdAt: "2026-08-03T00:00:00.000Z",
} satisfies CatalogueVersionRecord;

const result = {
  id: "66666666-6666-4666-8666-666666666666",
  analysisRunId: run.id,
  organisationId: run.organisationId,
  workspaceId: run.workspaceId,
  resultHash: "b".repeat(64),
  canonicalResult: {
    findings: { priorityOpportunities: ["planning_controls"] },
    patterns: { detected: [] },
    confidence: { result: { index: 80 } },
  },
  publishedAt: "2026-08-03T00:00:00.000Z",
} as unknown as Awaited<ReturnType<RecommendationEvaluationDependencies["getResult"]>>;

function stored(overrides: Partial<RecommendationEvaluationRecord> = {}) {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    analysisRunId: run.id,
    intelligenceResultId: result!.id,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    configurationSetId: run.configurationSetId,
    catalogueVersionId: catalogue.id,
    catalogueId: catalogue.catalogueId,
    catalogueVersion: catalogue.version,
    catalogueDigest: catalogue.contentDigest,
    policyVersion: "PB-004/S4-002/1.0.0",
    evaluatorVersion: "deliveryiq.recommendation-evaluator/1.0.0",
    inputHash: "c".repeat(64),
    outputHash: "d".repeat(64),
    canonicalInput: {} as RecommendationEvaluationRecord["canonicalInput"],
    candidates: [],
    createdAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  } satisfies RecommendationEvaluationRecord;
}

function harness(
  options: {
    existing?: RecommendationEvaluationRecord | null;
    traceScope?: "valid" | "cross-run";
    activeCatalogue?: CatalogueVersionRecord | null;
  } = {},
) {
  let publishedInput: Record<string, unknown> | null = null;
  const repo: RecommendationEvaluationRepository = {
    getEvaluation: vi.fn(async () => options.existing ?? null),
    publishEvaluation: vi.fn(async (input) => {
      publishedInput = input;
      return stored();
    }),
  };
  const deps: RecommendationEvaluationDependencies = {
    getActiveCatalogue: vi.fn(async () =>
      options.activeCatalogue === undefined ? catalogue : options.activeCatalogue,
    ),
    getResult: vi.fn(async () => result),
    getTrace: vi.fn(async () => ({
      nodes: [
        {
          id: "88888888-8888-4888-8888-888888888888",
          tenantId: run.organisationId,
          workspaceId: run.workspaceId,
          analysisRunId:
            options.traceScope === "cross-run" ? "99999999-9999-4999-8999-999999999999" : run.id,
          nodeType: "finding",
          domainId: "finding:planning_controls",
          domainVersion: "1.0.0",
          configurationSetId: run.configurationSetId,
          contentHash: "e".repeat(64),
          visible: true,
          payload: {},
        },
      ],
    })),
  };
  return {
    service: new RecommendationEvaluationService(repo, deps),
    repo,
    deps,
    published: () => publishedInput,
  };
}

describe("S4-002 deterministic recommendation evaluation", () => {
  it("records one terminal result for every active catalogue item", () => {
    const output = evaluatePinnedCatalogue(catalogue.snapshot, {
      opportunities: ["governance", "risk_assurance"],
      patterns: ["pat_resilient_delivery_foundation"],
      analysisConfidence: 80,
    });
    expect(output.candidates).toHaveLength(10);
    expect(new Set(output.candidates.map((item) => item.recommendationId)).size).toBe(10);
    expect(
      output.candidates.every((item) =>
        ["eligible", "ineligible", "excluded"].includes(item.result),
      ),
    ).toBe(true);
    expect(
      output.candidates.find((item) => item.recommendationId === "rec_risk_assurance"),
    ).toMatchObject({
      result: "excluded",
      exclusions: ["pattern:pat_resilient_delivery_foundation"],
    });
  });

  it("evaluates exclusions before accepting a matched trigger", () => {
    const output = evaluatePinnedCatalogue(catalogue.snapshot, {
      opportunities: ["risk_assurance"],
      patterns: ["pat_resilient_delivery_foundation"],
      analysisConfidence: 80,
    });
    expect(
      output.candidates.find((item) => item.recommendationId === "rec_risk_assurance")?.result,
    ).toBe("excluded");
  });

  it("is invariant to input and catalogue order", () => {
    const input = {
      opportunities: ["reporting_insight", "governance"],
      patterns: ["pat_benefits_blind_spot", "pat_governance_sponsorship_gap"],
      analysisConfidence: 60,
    };
    const reordered = structuredClone(catalogue.snapshot);
    reordered.definitions.reverse();
    expect(evaluatePinnedCatalogue(reordered, input)).toEqual(
      evaluatePinnedCatalogue(catalogue.snapshot, {
        ...input,
        opportunities: [...input.opportunities].reverse(),
        patterns: [...input.patterns].reverse(),
      }),
    );
  });

  it.each([
    { opportunities: ["unknown"], patterns: [], analysisConfidence: 80 },
    { opportunities: [], patterns: ["unknown"], analysisConfidence: 80 },
    { opportunities: [], patterns: [], analysisConfidence: 101 },
  ])("fails closed for unknown or invalid signals", (input) => {
    expect(() => evaluatePinnedCatalogue(catalogue.snapshot, input)).toThrow(
      RecommendationEvaluationError,
    );
  });

  it("preserves exact confidence state boundaries without applying the S4-003 gate", () => {
    expect(recommendationConfidenceState(49.999999)).toBe("low");
    expect(recommendationConfidenceState(50)).toBe("moderate");
    expect(recommendationConfidenceState(74.999999)).toBe("moderate");
    expect(recommendationConfidenceState(75)).toBe("high");
  });

  it("records unmet dependencies without changing eligibility", () => {
    const output = evaluateRecommendationCandidates(catalogue.snapshot.definitions, {
      opportunities: ["planning_controls"],
      patterns: [],
      analysisConfidence: 80,
    });
    expect(
      output.find((item) => item.recommendationId === "rec_integrated_controls"),
    ).toMatchObject({
      result: "eligible",
      unmetPrerequisites: ["rec_decision_rights"],
    });
  });

  it("evaluates 250 candidates well inside the portfolio-generation budget", () => {
    const template = catalogue.snapshot.definitions[0];
    const definitions = Array.from({ length: 250 }, (_, index) => ({
      ...structuredClone(template),
      id: `rec_performance_${index}`,
      order: index + 1,
      version: "1.0.0",
      dependencies: [],
    }));
    const started = performance.now();
    const output = evaluateRecommendationCandidates(definitions, {
      opportunities: ["governance"],
      patterns: [],
      analysisConfidence: 80,
    });
    expect(output).toHaveLength(250);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("S4-002 persistence and projection service", () => {
  it("publishes a tenant-scoped, catalogue-pinned evaluation with complete candidates", async () => {
    const { service, published } = harness();
    await expect(service.evaluate(run)).resolves.toMatchObject({ reused: false });
    expect(published()).toMatchObject({
      analysis_run_id: run.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      catalogue_version_id: catalogue.id,
      policy_version: "PB-004/S4-002/1.0.0",
    });
    expect(published()!.candidates as unknown[]).toHaveLength(10);
  });

  it("reuses the immutable evaluation for the same run and catalogue", async () => {
    const existing = stored();
    const { service, repo } = harness({ existing });
    await expect(service.evaluate(run)).resolves.toEqual({ evaluation: existing, reused: true });
    expect(repo.publishEvaluation).not.toHaveBeenCalled();
  });

  it("fails closed for missing active catalogue and cross-run trace", async () => {
    await expect(harness({ activeCatalogue: null }).service.evaluate(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_EVALUATION_INVALID",
    });
    await expect(harness({ traceScope: "cross-run" }).service.evaluate(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_EVALUATION_INVALID",
    });
  });

  it("hides ineligible/excluded candidates and audit detail from customer projection", () => {
    const candidate = {
      id: "candidate-1",
      evaluationId: "evaluation-1",
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      recommendationDefinitionId: "definition-1",
      recommendationId: "rec_decision_rights",
      recommendationVersion: "1.0.0",
      catalogueOrder: 1,
      result: "eligible" as const,
      matchedTriggers: ["opportunity:governance"],
      unmetTriggers: ["pattern:pat_governance_sponsorship_gap"],
      unmetPrerequisites: [],
      exclusions: [],
      confidenceState: "high" as const,
      decisiveFacts: [],
      sourceDomainIds: ["finding:governance"],
      sourceTraceNodeIds: ["trace-1"],
      semanticHash: "a".repeat(64),
    };
    const record = stored({
      candidates: [
        candidate,
        {
          ...candidate,
          id: "candidate-2",
          recommendationId: "rec_sponsor_contract",
          result: "ineligible",
        },
      ],
    });
    const customer = projectRecommendationEvaluation(record, false);
    const audit = projectRecommendationEvaluation(record, true);
    expect(customer.candidates).toHaveLength(1);
    expect(customer.candidates[0]).not.toHaveProperty("unmetTriggers");
    expect(customer.candidates[0]).not.toHaveProperty("traceIds");
    expect(audit.candidates).toHaveLength(2);
    expect(audit.candidates[0]).toHaveProperty("traceIds", ["trace-1"]);
  });

  it("reserves tenant evaluation audit detail for audit permission", () => {
    expect(canViewRecommendationEvaluationAudit(["recommendation:govern"])).toBe(false);
    expect(canViewRecommendationEvaluationAudit(["assessment:read", "recommendation:govern"])).toBe(
      false,
    );
    expect(canViewRecommendationEvaluationAudit(["audit:read"])).toBe(true);
  });
});
