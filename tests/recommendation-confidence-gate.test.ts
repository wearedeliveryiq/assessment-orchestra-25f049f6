import { describe, expect, it, vi } from "vitest";

import type { AssessmentAnalysisRun } from "@/lib/analysis/types";
import { sprint03CatalogueSnapshot } from "@/lib/recommendation-catalogue/catalogue";
import type { CatalogueVersionRecord } from "@/lib/recommendation-catalogue/types";
import { applyRecommendationConfidenceGate } from "@/lib/recommendation-confidence/gate";
import { projectRecommendationConfidenceGate } from "@/lib/recommendation-confidence/projection";
import {
  RecommendationConfidenceGateService,
  type RecommendationConfidenceGateDependencies,
  type RecommendationConfidenceGateRepository,
} from "@/lib/recommendation-confidence/service.server";
import type { RecommendationConfidenceGateRecord } from "@/lib/recommendation-confidence/types";
import type { RecommendationEvaluationRecord } from "@/lib/recommendation-evaluation/types";
import { evaluateRecommendationCandidates } from "@/lib/recommendations/eligibility";

const catalogueSnapshot = sprint03CatalogueSnapshot();
const confidenceTraceId = "88888888-8888-4888-8888-888888888888";
const findingTraceId = "99999999-9999-4999-8999-999999999999";

function evaluatedCandidates(confidence: number) {
  return evaluateRecommendationCandidates(catalogueSnapshot.definitions, {
    opportunities: ["governance", "reporting_insight"],
    patterns: [],
    analysisConfidence: confidence,
  }).map((candidate, index) => ({
    ...candidate,
    id: `candidate-${index}`,
    evaluationId: "77777777-7777-4777-8777-777777777777",
    organisationId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    recommendationDefinitionId: `definition-${index}`,
    semanticHash: "a".repeat(64),
    sourceTraceNodeIds:
      candidate.recommendationId === "rec_deepen_diagnosis"
        ? [confidenceTraceId]
        : [findingTraceId],
  }));
}

function apply(confidence: number, limitationCodes: string[]) {
  return applyRecommendationConfidenceGate({
    analysisConfidence: confidence,
    limitationCodes,
    definitions: catalogueSnapshot.definitions,
    candidates: evaluatedCandidates(confidence),
  });
}

describe("S4-003 deterministic confidence gate", () => {
  it.each([
    { confidence: 49.999999, limitations: ["limited_respondent_breadth"], state: "low" },
    { confidence: 50, limitations: ["limited_respondent_breadth"], state: "moderate" },
    { confidence: 74.999999, limitations: ["stale_evidence"], state: "moderate" },
    { confidence: 75, limitations: [], state: "high" },
  ])("preserves the exact boundary at $confidence", ({ confidence, limitations, state }) => {
    expect(apply(confidence, limitations).confidence.state).toBe(state);
  });

  it("withholds low-confidence material actions without rejecting the base evaluation", () => {
    const base = evaluatedCandidates(49.999999);
    const output = applyRecommendationConfidenceGate({
      analysisConfidence: 49.999999,
      limitationCodes: ["limited_respondent_breadth"],
      definitions: catalogueSnapshot.definitions,
      candidates: base,
    });
    expect(base.find((item) => item.recommendationId === "rec_decision_rights")?.result).toBe(
      "eligible",
    );
    expect(
      output.candidates.find((item) => item.recommendationId === "rec_decision_rights"),
    ).toMatchObject({
      preGateResult: "eligible",
      postGateResult: "withheld",
      reasonCode: "low_confidence_material_action",
    });
  });

  it("presents low-effort advice and marks deeper diagnosis as evidence-first", () => {
    const output = apply(49.999999, ["limited_respondent_breadth"]);
    expect(
      output.candidates.find((item) => item.recommendationId === "rec_delivery_insight"),
    ).toMatchObject({ postGateResult: "presented", effort: "low" });
    expect(
      output.candidates.find((item) => item.recommendationId === "rec_deepen_diagnosis"),
    ).toMatchObject({
      postGateResult: "evidence_first",
      reasonCode: "low_confidence_evidence_first",
      effort: "low",
    });
  });

  it("uses only locked caveat and limitation copy", () => {
    expect(apply(49.999999, ["limited_respondent_breadth"]).confidence.caveat).toBe(
      "This result is directional because the available evidence has low confidence. Validate the priority areas before committing material action.",
    );
    expect(apply(60, ["stale_evidence", "limited_respondent_breadth"]).confidence.caveat).toBe(
      "Some evidence may no longer reflect current practice. The result represents a limited range of perspectives.",
    );
    expect(apply(75, []).confidence.caveat).toBeNull();
  });

  it("changes only gate/confidence components when confidence changes", () => {
    const moderate = apply(60, ["limited_respondent_breadth"]);
    const high = apply(80, []);
    const stable = (item: (typeof moderate.candidates)[number]) => ({
      recommendationId: item.recommendationId,
      recommendationVersion: item.recommendationVersion,
      catalogueOrder: item.catalogueOrder,
      effort: item.effort,
      preGateResult: item.preGateResult,
    });
    expect(moderate.candidates.map(stable)).toEqual(high.candidates.map(stable));
  });

  it.each([
    { confidence: Number.NaN, limitations: [] },
    { confidence: 60, limitations: [] },
    { confidence: 60, limitations: ["unknown_limitation"] },
    {
      confidence: 60,
      limitations: ["limited_respondent_breadth", "limited_respondent_breadth"],
    },
  ])("fails closed for unavailable or invalid confidence evidence", (input) => {
    expect(() => apply(input.confidence, input.limitations)).toThrow();
  });

  it("gates 250 eligible candidates inside the portfolio-generation budget", () => {
    const template = catalogueSnapshot.definitions.find(
      (item) => item.id === "rec_delivery_insight",
    )!;
    const definitions = Array.from({ length: 249 }, (_, index) => ({
      ...structuredClone(template),
      id: `rec_gate_performance_${index}`,
      order: index + 1,
    }));
    const evidenceFirst = catalogueSnapshot.definitions.find(
      (item) => item.id === "rec_deepen_diagnosis",
    )!;
    definitions.push({ ...structuredClone(evidenceFirst), order: 250 });
    const candidates = definitions.map((definition) => ({
      recommendationId: definition.id,
      recommendationVersion: definition.version,
      catalogueOrder: definition.order,
      result: "eligible" as const,
      sourceTraceNodeIds: [findingTraceId],
    }));
    const started = performance.now();
    expect(
      applyRecommendationConfidenceGate({
        analysisConfidence: 40,
        limitationCodes: ["limited_respondent_breadth"],
        definitions,
        candidates,
      }).candidates,
    ).toHaveLength(250);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

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
  sourceConfigurationSetId: run.configurationSetId,
  contentDigest: "b".repeat(64),
  snapshot: catalogueSnapshot,
  state: "active",
  authoredBy: "55555555-5555-4555-8555-555555555555",
  createdAt: "2026-08-03T00:00:00.000Z",
} satisfies CatalogueVersionRecord;

const evaluation = {
  id: "77777777-7777-4777-8777-777777777777",
  analysisRunId: run.id,
  intelligenceResultId: "66666666-6666-4666-8666-666666666666",
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
  candidates: evaluatedCandidates(40),
  createdAt: "2026-08-03T00:00:00.000Z",
} satisfies RecommendationEvaluationRecord;

function storedGate(): RecommendationConfidenceGateRecord {
  const output = apply(40, ["limited_respondent_breadth"]);
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    recommendationEvaluationId: evaluation.id,
    analysisRunId: run.id,
    intelligenceResultId: evaluation.intelligenceResultId,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    configurationSetId: run.configurationSetId,
    catalogueVersionId: catalogue.id,
    catalogueId: catalogue.catalogueId,
    catalogueVersion: catalogue.version,
    catalogueDigest: catalogue.contentDigest,
    policyVersion: output.policyVersion,
    confidenceVersion: output.confidenceVersion,
    gateEngineVersion: output.gateEngineVersion,
    confidenceIndex: 40,
    confidenceState: "low",
    limitationCodes: ["limited_respondent_breadth"],
    caveat: output.confidence.caveat,
    confidenceTraceNodeId: confidenceTraceId,
    inputHash: "e".repeat(64),
    outputHash: "f".repeat(64),
    canonicalInput: {} as RecommendationConfidenceGateRecord["canonicalInput"],
    canonicalGate: output,
    candidates: output.candidates.map((candidate, index) => ({
      ...candidate,
      sourceTraceNodeIds: [...new Set([...candidate.sourceTraceNodeIds, confidenceTraceId])].sort(),
      id: `gate-candidate-${index}`,
      confidenceGateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      candidateEvaluationId: evaluation.candidates.find(
        (item) => item.recommendationId === candidate.recommendationId,
      )!.id,
      recommendationDefinitionId: evaluation.candidates.find(
        (item) => item.recommendationId === candidate.recommendationId,
      )!.recommendationDefinitionId,
      organisationId: run.organisationId,
      workspaceId: run.workspaceId,
      semanticHash: "1".repeat(64),
    })),
    createdAt: "2026-08-03T00:01:00.000Z",
  };
}

function serviceHarness(existing: RecommendationConfidenceGateRecord | null = null) {
  let publishedInput: Record<string, unknown> | null = null;
  const repo: RecommendationConfidenceGateRepository = {
    getConfidenceGate: vi.fn(async () => existing),
    getConfidenceGateForRun: vi.fn(async () => existing),
    publishConfidenceGate: vi.fn(async (input) => {
      publishedInput = input;
      return storedGate();
    }),
  };
  const deps: RecommendationConfidenceGateDependencies = {
    getEvaluation: vi.fn(async () => evaluation),
    getResult: vi.fn(
      async () =>
        ({
          id: evaluation.intelligenceResultId,
          analysisRunId: run.id,
          organisationId: run.organisationId,
          workspaceId: run.workspaceId,
          resultHash: "2".repeat(64),
          canonicalResult: {
            confidence: {
              result: {
                index: 40,
                band: "low",
                limitations: ["limited_respondent_breadth"],
              },
            },
          },
        }) as never,
    ),
    getCatalogueVersion: vi.fn(async () => catalogue),
    getTrace: vi.fn(async () => ({
      nodes: [
        {
          id: confidenceTraceId,
          tenantId: run.organisationId,
          workspaceId: run.workspaceId,
          analysisRunId: run.id,
          nodeType: "confidence_result",
          domainId: "confidence",
          domainVersion: "1.0.0",
          configurationSetId: run.configurationSetId,
          contentHash: "3".repeat(64),
          visible: true,
          payload: {},
        },
      ],
    })),
  };
  return {
    service: new RecommendationConfidenceGateService(repo, deps),
    repo,
    deps,
    published: () => publishedInput,
  };
}

describe("S4-003 persistence, isolation and projection", () => {
  it("publishes a pinned tenant-scoped gate with complete lineage", async () => {
    const { service, published } = serviceHarness();
    await expect(service.evaluate(run)).resolves.toMatchObject({ reused: false });
    expect(published()).toMatchObject({
      recommendation_evaluation_id: evaluation.id,
      analysis_run_id: run.id,
      organisation_id: run.organisationId,
      workspace_id: run.workspaceId,
      confidence_trace_node_id: confidenceTraceId,
      policy_version: "PB-004/S4-003/1.0.0",
    });
    expect(
      (published()!.candidates as Array<{ sourceTraceNodeIds: string[] }>).every((candidate) =>
        candidate.sourceTraceNodeIds.includes(confidenceTraceId),
      ),
    ).toBe(true);
  });

  it("reuses the immutable gate for the same base evaluation", async () => {
    const existing = storedGate();
    const { service, repo } = serviceHarness(existing);
    await expect(service.evaluate(run)).resolves.toEqual({ gate: existing, reused: true });
    expect(repo.publishConfidenceGate).not.toHaveBeenCalled();
  });

  it("fails closed for a cross-tenant base evaluation", async () => {
    const { service, deps } = serviceHarness();
    vi.mocked(deps.getEvaluation).mockResolvedValueOnce({
      ...evaluation,
      organisationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    await expect(service.evaluate(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_EVALUATION_INVALID",
      status: 422,
    });
  });

  it("fails closed for missing or cross-scope confidence lineage", async () => {
    const { service, deps } = serviceHarness();
    vi.mocked(deps.getTrace).mockResolvedValueOnce({
      nodes: [
        {
          id: confidenceTraceId,
          tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          workspaceId: run.workspaceId,
          analysisRunId: run.id,
          nodeType: "confidence_result",
          domainId: "confidence",
          domainVersion: "1.0.0",
          configurationSetId: run.configurationSetId,
          contentHash: "3".repeat(64),
          visible: true,
          payload: {},
        },
      ],
    });
    await expect(service.evaluate(run)).rejects.toMatchObject({
      code: "RECOMMENDATION_EVALUATION_INVALID",
      status: 422,
    });
  });

  it("restricts withheld identities and lineage outside the audit projection", () => {
    const gate = storedGate();
    const workspace = projectRecommendationConfidenceGate(gate, "workspace");
    const publicResult = projectRecommendationConfidenceGate(gate, "public");
    const audit = projectRecommendationConfidenceGate(gate, "audit");
    expect(JSON.stringify(workspace)).not.toContain("rec_decision_rights");
    expect(JSON.stringify(workspace)).not.toContain("traceIds");
    expect(JSON.stringify(publicResult)).not.toContain(run.id);
    expect(JSON.stringify(publicResult)).not.toContain("recommendationId");
    expect(workspace.withheld).toMatchObject({
      count: 1,
      reasonCode: "low_confidence_material_action",
    });
    expect(audit.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recommendationId: "rec_decision_rights",
          postGateResult: "withheld",
          traceIds: expect.arrayContaining([confidenceTraceId]),
        }),
      ]),
    );
  });
});
