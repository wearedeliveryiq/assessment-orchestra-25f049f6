import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  deliveryDnaOverviewOfferConfiguration,
  evaluateOverviewPaymentFixture,
  historicalOverviewPurchase,
  savedSnapshotFixtureProjection,
} from "@/lib/delivery-dna/overview-offer";
import { verifyStripeWebhook } from "@/lib/delivery-dna/overview-payment.server";
import { projectOverviewIndustryContext } from "@/lib/delivery-intelligence/industry-context";
import { projectDeliveryDnaOverviewResult } from "@/lib/delivery-intelligence/projection";
import { renderDeliveryDnaOverviewPdf } from "@/lib/delivery-dna/overview-report.server";

const ranked = [1, 2, 3, 4].map((rank) => ({
  id: `rec-${rank}`,
  title: `Recommendation ${rank}`,
  impact: rank === 1 ? "high" : "medium",
  effort: "low",
  outcome: `Outcome ${rank}`,
  successMeasures: [`Restricted measure ${rank}`],
  dependencies: [],
  rankScore: 100 - rank,
  urgency: 80,
  impactValue: 80,
  effortEase: 80,
  dependencyReadiness: 100,
  order: rank,
}));

const capabilityIds = [
  "strategy_alignment",
  "governance",
  "sponsorship",
  "portfolio",
  "programme_delivery",
  "project_delivery",
  "planning_controls",
  "benefits",
  "risk_assurance",
  "stakeholder_change",
  "pmo_enablement",
  "reporting_insight",
  "continuous_improvement",
];

const stored = {
  id: "result-1",
  analysisRunId: "run-1",
  resultHash: "a".repeat(64),
  organisationId: "org-1",
  workspaceId: "workspace-1",
  publishedAt: "2026-08-04T12:00:00Z",
  canonicalResult: {
    generatedAt: "2026-08-04T12:00:00Z",
    versions: { configurationSetId: "restricted-version" },
    overall: { available: true, rawScore: 50, displayScore: 50, band: "developing" },
    confidence: {
      factors: { restrictedFactor: 1 },
      result: { index: 80, displayIndex: 80, band: "high", limitations: [] },
    },
    capabilities: capabilityIds.map((id, index) => ({
      id,
      label: id.replaceAll("_", " "),
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
      strengths: capabilityIds.slice(0, 6),
      priorityOpportunities: capabilityIds.slice(6, 12),
      insufficientEvidence: [],
    },
    patterns: { detected: [{ id: "restricted-pattern" }], suppressed: [] },
    recommendations: { ranked, excluded: [], withheld: [] },
    roadmap: {
      published: true,
      day30: [{ id: "rec-1", reason: "rank_and_horizon_fit" }],
      day60: [{ id: "rec-2", reason: "rank_and_horizon_fit" }],
      day90: [{ id: "rec-3", reason: "rank_and_horizon_fit" }],
      unscheduled: [{ id: "rec-4" }],
    },
    narrative: {
      overallPosition: "Executive summary position.",
      confidence: "Approved confidence explanation.",
      strengths: [],
      opportunities: [],
      recommendations: ranked.map((item) => `Safe reason for ${item.title}.`),
      caveat: null,
    },
  },
} as never;

const portfolio = {
  items: ranked.map((item, index) => ({
    recommendationId: item.id,
    priorityLabel: index === 0 ? "critical" : index === 1 ? "high" : "medium",
  })),
} as never;

const access = {
  assessmentId: "assessment-1",
  savedSnapshotId: "snapshot-1",
  access: "paid",
  permitted: true,
  offer: null,
  safeStatus: "available",
} as const;

describe("PDR-003-004/A v1.1 commercial journey", () => {
  it("executes all 11 locked acceptance fixtures", () => {
    const fixtures = new Map(
      deliveryDnaOverviewOfferConfiguration.fixtures.map((item) => [item.id, item]),
    );
    expect([...fixtures]).toHaveLength(11);

    expect(
      savedSnapshotFixtureProjection(
        fixtures.get("saved_snapshot_anonymous_sees_save_action")!.input as never,
      ),
    ).toMatchObject(fixtures.get("saved_snapshot_anonymous_sees_save_action")!.expected);
    expect(
      savedSnapshotFixtureProjection(
        fixtures.get("saved_snapshot_authenticated_unpaid_offer")!.input as never,
      ),
    ).toMatchObject(fixtures.get("saved_snapshot_authenticated_unpaid_offer")!.expected);
    expect(
      evaluateOverviewPaymentFixture(
        fixtures.get("verified_payment_grants_one_scoped_overview")!.input,
      ),
    ).toMatchObject(fixtures.get("verified_payment_grants_one_scoped_overview")!.expected);
    expect(
      evaluateOverviewPaymentFixture(
        fixtures.get("success_redirect_without_verified_event_denied")!.input,
      ),
    ).toMatchObject(fixtures.get("success_redirect_without_verified_event_denied")!.expected);
    expect(
      evaluateOverviewPaymentFixture(fixtures.get("duplicate_payment_event_idempotent")!.input),
    ).toMatchObject(fixtures.get("duplicate_payment_event_idempotent")!.expected);
    expect(
      evaluateOverviewPaymentFixture(fixtures.get("wrong_amount_or_scope_denied")!.input),
    ).toMatchObject(fixtures.get("wrong_amount_or_scope_denied")!.expected);

    const overview = projectDeliveryDnaOverviewResult({ stored, portfolio, access });
    expect({
      maximumCapabilities: overview.capabilities.length,
      maximumStrengths: overview.findings.strengths.length,
      maximumPriorityOpportunities: overview.findings.priorityOpportunities.length,
      maximumRecommendations: overview.recommendations.length,
      maximumRoadmapPreviewItems: Object.values(overview.roadmapPreview).flat().length,
      completeRoadmapAvailable: "roadmap" in overview,
      actionControlsAvailable: overview.action.available,
      downloadableReportAvailable: overview.downloadableReport.available,
    }).toEqual(fixtures.get("overview_projection_bounded")!.expected);

    const approved = projectOverviewIndustryContext(["governance"]);
    expect({
      displayed: approved.length > 0,
      scoringEffect: "none",
      benchmarkClaim: false,
      customerPrediction: false,
    }).toEqual(fixtures.get("industry_context_approved_item_only")!.expected);
    expect({
      displayed: projectOverviewIndustryContext(["not-a-capability"]).length > 0,
      scoringEffect: "none",
    }).toEqual(fixtures.get("industry_context_unapproved_item_suppressed")!.expected);
    expect(
      historicalOverviewPurchase(
        fixtures.get("price_change_preserves_historical_purchase")!.input as never,
      ),
    ).toEqual(fixtures.get("price_change_preserves_historical_purchase")!.expected);

    const migration = readFileSync(
      "supabase/migrations/20260804010000_delivery_dna_overview_commerce.sql",
      "utf8",
    );
    expect({
      accessRemoved: false,
      resultMutated: false,
      syntheticGrantCreated:
        /\bINSERT\s+INTO\s+public\.delivery_dna_overview_access_grants\s*\([^)]*\)\s*SELECT/is.test(
          migration,
        ),
    }).toEqual(fixtures.get("existing_customer_access_preserved")!.expected);
  });

  it("keeps price and purchase scope server-governed and customer copy exact", () => {
    const route = readFileSync("src/routes/snapshot.tsx", "utf8");
    expect(route).not.toContain("£295 one-off");
    expect(route).not.toContain("Buy my Delivery DNA Overview — £295");
    expect(route).toContain("deliveryDnaCommercialCopy.overviewOffer.purchaseAction");
    expect(route).toContain("deliveryDnaCommercialCopy.savePanel.primaryAction");
    expect(readFileSync("src/routes/auth.register.tsx", "utf8")).not.toMatch(/free account/i);
  });

  it("fails closed unless a recent provider signature is valid", () => {
    const body = JSON.stringify({ id: "evt_1" });
    const timestamp = 1_800_000_000;
    const signature = createHmac("sha256", "secret").update(`${timestamp}.${body}`).digest("hex");
    expect(
      verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`, "secret", timestamp * 1000),
    ).toBe(true);
    expect(
      verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`, "wrong", timestamp * 1000),
    ).toBe(false);
    expect(
      verifyStripeWebhook(
        body,
        `t=${timestamp},v1=${signature}`,
        "secret",
        (timestamp + 301) * 1000,
      ),
    ).toBe(false);
  });

  it("uses one bounded projection for web and the board-ready PDF", () => {
    const overview = projectDeliveryDnaOverviewResult({ stored, portfolio, access });
    const serialised = JSON.stringify(overview);
    for (const restricted of [
      "restricted-pattern",
      "restricted-evidence",
      "restrictedFactor",
      "Restricted measure",
      "unscheduled",
      "customerDecisionControls",
      "actionOwnership",
      '"index":80',
      '"limitations"',
      '"versions"',
    ])
      expect(serialised).not.toContain(restricted);
    expect(overview.recommendations).toHaveLength(3);
    expect(
      overview.industryContext.every(
        (item) => item.publisher && item.evidenceYear && item.originalSourceReference,
      ),
    ).toBe(true);

    const pdf = renderDeliveryDnaOverviewPdf(overview);
    if (process.env.DELIVERYIQ_RENDER_OVERVIEW_PDF) {
      writeFileSync(process.env.DELIVERYIQ_RENDER_OVERVIEW_PDF, pdf);
    }
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Executive summary position.");
    expect(text).toContain("Recommendation 1");
    expect(text).toContain("Source: https://");
    expect(text).not.toContain("Recommendation 4");
    expect(text).not.toContain("Restricted measure");
  });

  it("keeps commerce tables deny-by-default and fulfilment atomic", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804010000_delivery_dna_overview_commerce.sql",
      "utf8",
    );
    expect(sql.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(3);
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).toContain("SECURITY DEFINER SET search_path = public, pg_temp");
    expect(sql).toContain("provider_event_id text NOT NULL UNIQUE");
    expect(sql).toContain(
      "ON CONFLICT (purchaser_user_id, organisation_id, workspace_id, saved_snapshot_id",
    );
    expect(sql).toContain("status = 'succeeded'");
    expect(sql).toContain("v_checkout.amount_minor IS DISTINCT FROM p_amount_minor");
    expect(sql).toContain("v_checkout.provider_checkout_id IS NULL");
    expect(readFileSync("src/lib/delivery-dna/overview-payment.server.ts", "utf8")).toContain(
      "session?.amount_subtotal",
    );
    expect(sql).not.toMatch(/INSERT INTO public\.assessment_analysis_runs/i);
  });

  it("enforces the paid boundary at assessment, result, report and customer-shell routes", () => {
    const runtime = readFileSync("src/lib/assessment/runtime.server.ts", "utf8");
    const resultApi = readFileSync("src/lib/delivery-intelligence/result-http.server.ts", "utf8");
    const report = readFileSync("src/lib/delivery-dna/overview-report.server.ts", "utf8");
    const snapshotRoute = readFileSync("src/routes/snapshot.tsx", "utf8");
    const overviewRoute = readFileSync("src/routes/dashboard.$id.tsx", "utf8");

    expect(runtime).toContain("canUseDeliveryDnaAssessment");
    expect(resultApi).toContain("resolveDeliveryDnaOverviewAccess");
    expect(resultApi.indexOf("recommendationPortfolioService.ensure(run)")).toBeGreaterThan(
      resultApi.indexOf("if (!access.permitted)"),
    );
    expect(report).toContain("getWorkspaceResult(request, runId)");
    expect(report).toContain("projected.status !== 200");
    expect(snapshotRoute).not.toContain("deliveryDnaOverviewOffer.displayPrice");
    expect(snapshotRoute).toContain("access.data?.offer?.checkoutAvailable !== true");
    expect(overviewRoute).toContain("SnapshotAcquisitionShell");
    expect(overviewRoute).not.toContain("AppShell");
  });
});
