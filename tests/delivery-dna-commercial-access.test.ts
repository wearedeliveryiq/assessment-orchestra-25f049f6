import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DELIVERY_DNA_COMMERCIAL_POLICY,
  approvedCommercialContactRoute,
  evaluateDeliveryDnaCommercialAccess,
} from "@/lib/delivery-intelligence/commercial-access";
import { publicSourceFromWorkspace } from "@/lib/delivery-intelligence/disclosure";
import {
  projectCommercialWorkspaceResult,
  projectFreeWorkspaceResult,
  projectWorkspaceResult,
} from "@/lib/delivery-intelligence/projection";
import type { StoredIntelligenceResult } from "@/lib/delivery-intelligence/result-repository.server";
import type { RecommendationPortfolioRecord } from "@/lib/recommendation-portfolio/types";
import { firstPartyRedirect } from "@/lib/identity/http.server";

const now = "2026-08-03T12:00:00Z";
const availability = {
  productType: "delivery_dna_action",
  productId: "delivery_dna_action",
  productVersion: "1.0.0",
  status: "active",
};
const entitlement = {
  organisationId: "org-1",
  workspaceId: "workspace-1",
  productType: "delivery_dna_action",
  productId: "delivery_dna_action",
  productVersion: "1.0.0",
  entitled: true,
  validFrom: "2026-08-01T00:00:00Z",
  expiresAt: null,
  revokedAt: null,
};
const decision = (overrides: Record<string, unknown> = {}) =>
  evaluateDeliveryDnaCommercialAccess({
    organisationId: "org-1",
    workspaceId: "workspace-1",
    availability,
    entitlement,
    permitted: true,
    now,
    ...overrides,
  });

const ranked = [1, 2, 3, 4].map((rank) => ({
  id: `rec-${rank}`,
  title: `Recommendation ${rank}`,
  impact: rank === 1 ? "high" : "medium",
  effort: rank === 4 ? "high" : "low",
  outcome: `Outcome ${rank}`,
  successMeasures: [`Restricted measure ${rank}`],
  dependencies: rank === 4 ? ["rec-1"] : [],
  rankScore: 100 - rank,
  urgency: 80,
  impactValue: 80,
  effortEase: 80,
  dependencyReadiness: 100,
  order: rank,
}));

const stored = {
  id: "result-1",
  analysisRunId: "run-1",
  resultHash: "a".repeat(64),
  organisationId: "org-1",
  workspaceId: "workspace-1",
  publishedAt: now,
  canonicalResult: {
    generatedAt: now,
    versions: { configurationSetId: "config-1" },
    overall: { available: true, rawScore: 50, displayScore: 50, band: "developing" },
    confidence: {
      factors: { restrictedFactor: 1 },
      result: { index: 80, displayIndex: 80, band: "high", limitations: [] },
    },
    capabilities: Array.from({ length: 13 }, (_, index) => ({
      id: `cap-${index + 1}`,
      label: `Capability ${index + 1}`,
      order: index + 1,
      score: {
        available: true,
        rawScore: 50,
        displayScore: 50,
        band: "developing",
        eligibleQuestionCount: 3,
        missingQuestionIds: [],
        excludedQuestionIds: [],
        notApplicableQuestionIds: [],
      },
      confidenceContribution: 80,
      evidenceIds: ["restricted-evidence"],
    })),
    findings: {
      strengths: ["cap-1", "cap-2", "cap-3", "cap-4", "cap-5", "cap-6"],
      priorityOpportunities: ["cap-7", "cap-8", "cap-9", "cap-10", "cap-11", "cap-12"],
      insufficientEvidence: [],
    },
    patterns: { detected: [{ id: "restricted-pattern" }], suppressed: [] },
    recommendations: { ranked, excluded: [], withheld: [] },
    roadmap: {
      published: true,
      day30: [{ id: "rec-1", reason: "rank_and_horizon_fit" }],
      day60: [{ id: "rec-4", reason: "rank_and_horizon_fit" }],
      day90: [{ id: "rec-3", reason: "rank_and_horizon_fit" }],
      unscheduled: [],
    },
    narrative: {
      overallPosition: "Complete approved executive summary.",
      confidence: "Approved confidence explanation.",
      strengths: [],
      opportunities: [],
      recommendations: ranked.map((item) => `Safe reason for ${item.title}.`),
      caveat: null,
    },
  },
} as unknown as StoredIntelligenceResult;

const portfolio = {
  items: ranked.map((item, index) => ({
    recommendationId: item.id,
    priorityLabel: index === 0 ? "now" : index === 1 ? "next" : "later",
  })),
} as unknown as RecommendationPortfolioRecord;

describe("PDR-003-004 commercial access", () => {
  it("uses the exact current public registration label without changing the historical projector", () => {
    const full = projectWorkspaceResult(stored);
    const source = publicSourceFromWorkspace(full, "public-1");
    expect(source.registrationPrompt.label).toBe(
      DELIVERY_DNA_COMMERCIAL_POLICY.anonymousRegistrationLabel,
    );
    expect(source.registrationPrompt.destination).toBe(
      "/register?source=delivery-dna&result=public-1",
    );
    expect(readFileSync("src/routes/register.tsx", "utf8")).toContain('to: "/auth/register"');
  });

  it("projects only the authenticated free-account fields, top three and one item per horizon", () => {
    const free = projectFreeWorkspaceResult(stored, portfolio);
    expect(free.capabilities).toHaveLength(13);
    expect(free.findings.strengths).toHaveLength(5);
    expect(free.findings.priorityOpportunities).toHaveLength(5);
    expect(free.recommendations.map((item) => item.title)).toEqual([
      "Recommendation 1",
      "Recommendation 2",
      "Recommendation 3",
    ]);
    expect(free.executiveSummary.recommendations).toHaveLength(3);
    expect(free.roadmapPreview).toMatchObject({
      day30: [{ title: "Recommendation 1", horizon: "30 days", priorityLabel: "now" }],
      day60: [{ title: "Recommendation 4", horizon: "60 days", priorityLabel: "later" }],
      day90: [{ title: "Recommendation 3", horizon: "90 days", priorityLabel: "later" }],
    });
    const serialised = JSON.stringify(free);
    for (const restricted of [
      "successMeasures",
      "dependencies",
      "rankScore",
      "restricted-pattern",
      "restricted-evidence",
      "confidenceContribution",
      "restrictedFactor",
      "unscheduled",
      "rawScore",
      "configurationSetId",
    ]) {
      expect(serialised).not.toContain(restricted);
    }
  });

  it("reveals the same immutable result when entitled without recalculation", () => {
    const access = decision();
    const entitled = projectCommercialWorkspaceResult({ stored, portfolio, access });
    expect(entitled.commercialAccess.accessTier).toBe("entitled");
    expect(entitled.resultId).toBe(stored.id);
    expect(entitled.analysisRunId).toBe(stored.analysisRunId);
    expect(entitled.generatedAt).toBe(stored.canonicalResult.generatedAt);
    expect(entitled.recommendations).toHaveLength(4);
    expect(entitled.roadmap).toBe(stored.canonicalResult.roadmap);
  });

  it.each([
    ["missing availability", { availability: null }, "unavailable", false, true],
    ["missing entitlement", { entitlement: null }, "not_entitled", true, false],
    ["missing permission", { permitted: false }, "not_permitted", true, true],
    [
      "expired entitlement",
      { entitlement: { ...entitlement, expiresAt: now } },
      "not_entitled",
      true,
      false,
    ],
    [
      "revoked entitlement",
      { entitlement: { ...entitlement, revokedAt: now } },
      "not_entitled",
      true,
      false,
    ],
    ["other workspace", { workspaceId: "workspace-2" }, "not_entitled", true, false],
  ])("evaluates %s independently", (_name, overrides, state, available, entitled) => {
    expect(decision(overrides)).toMatchObject({
      accessTier: "free",
      state,
      available,
      entitled,
    });
  });

  it("suppresses an absent or external commercial route and preserves exact copy", () => {
    expect(approvedCommercialContactRoute(null)).toBeNull();
    expect(approvedCommercialContactRoute("https://example.com/sales")).toBeNull();
    expect(approvedCommercialContactRoute("/contact?campaign=founder")).toBe(
      "/contact?campaign=founder&source=delivery-dna-result",
    );
    const free = decision({ entitlement: null, commercialContactRoute: null });
    expect(free.panel).toMatchObject({
      heading: "Turn your Delivery DNA priorities into action",
      body: "Unlock your complete improvement plan, success measures and action tracking to help your team deliver and evidence progress.",
      action: null,
    });
  });

  it("keeps registration and verification redirects first-party", () => {
    const request = new Request("https://deliveryiq.example/api/auth/register");
    expect(
      firstPartyRedirect(
        request,
        "https://deliveryiq.example/auth/verify-email?snapshot=continue",
        "/auth/verify-email",
      ),
    ).toBe("https://deliveryiq.example/auth/verify-email?snapshot=continue");
    expect(
      firstPartyRedirect(request, "https://attacker.example/collect", "/auth/verify-email"),
    ).toBe("https://deliveryiq.example/auth/verify-email");
  });

  it("extends the existing boundary without activating, backfilling or bundling other products", () => {
    const sql = readFileSync(
      new URL(
        "../supabase/migrations/20260803200000_delivery_dna_action_entitlement.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(sql).toContain("'knowledge_pack', 'teammate', 'delivery_dna_action'");
    expect(sql).toContain("delivery_product_availability_delivery_dna_action");
    expect(sql).toContain("product_version = '1.0.0'");
    expect(sql).toContain("entitlement_source IN ('commercial', 'grandfathered')");
    expect(sql).not.toMatch(/\bINSERT\b/i);
    expect(sql).not.toMatch(/analysis_runs|delivery_intelligence_results/i);
  });

  it("enforces paid reads and writes at every server boundary while calculation stays tier-independent", () => {
    const guarded = [
      "src/lib/delivery-intelligence/explainability-http.server.ts",
      "src/lib/delivery-intelligence/recommendation-http.server.ts",
      "src/lib/recommendation-portfolio/http.server.ts",
      "src/lib/recommendation-decisions/http.server.ts",
      "src/lib/recommendation-actions/http.server.ts",
      "src/lib/recommendation-outcomes/http.server.ts",
      "src/lib/recommendation-experience/http.server.ts",
    ];
    for (const path of guarded) {
      expect(readFileSync(path, "utf8"), path).toContain("assertDeliveryDnaActionAccess");
    }
    const resultBoundary = readFileSync(
      "src/lib/delivery-intelligence/result-http.server.ts",
      "utf8",
    );
    expect(resultBoundary).toContain("recommendationPortfolioService.ensure(run)");
    expect(resultBoundary.indexOf("recommendationPortfolioService.ensure(run)")).toBeGreaterThan(
      resultBoundary.indexOf("resolveDeliveryDnaCommercialAccess"),
    );
  });
});
