import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  deliveryDnaOverviewOfferConfiguration,
  evaluateOverviewPaymentFixture,
  nonVatRegisteredCheckoutTotal,
  savedSnapshotFixtureProjection,
} from "@/lib/delivery-dna/overview-offer";
import {
  deliveryDnaOverviewStripeCheckoutParameters,
  stripeCheckoutTotals,
  verifyStripeWebhook,
} from "@/lib/delivery-dna/overview-payment.server";
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
  "strategic_alignment",
  "portfolio_prioritisation",
  "benefits_value",
  "sponsorship_accountability",
  "governance_decision_making",
  "risk_assurance_resilience",
  "delivery_approach_lifecycle",
  "planning_control_dependencies",
  "capacity_delivery_ecosystem",
  "leadership_culture_collaboration",
  "stakeholder_change_adoption",
  "delivery_capability_enablement",
  "data_reporting_decision_insight",
  "learning_adaptability_improvement",
  "digital_automation_responsible_ai",
];

const stored = {
  id: "result-1",
  analysisRunId: "run-1",
  resultHash: "a".repeat(64),
  organisationId: "org-1",
  workspaceId: "workspace-1",
  publishedAt: "2026-08-04T12:00:00Z",
  canonicalResult: {
    schemaVersion: "deliveryiq.intelligence-result/2.1.0",
    generatedAt: "2026-08-04T12:00:00Z",
    versions: { configurationSetId: "restricted-version" },
    overall: { available: true, rawScore: 50, displayScore: 50, band: "developing" },
    confidence: {
      factors: { restrictedFactor: 1 },
      result: { index: 80, displayIndex: 80, band: "high", limitations: [] },
    },
    domains: [
      "direction_value",
      "leadership_governance",
      "delivery_system",
      "people_enablement",
      "insight_adaptation",
    ].map((domainId) => ({
      domainId,
      available: true,
      rawScore: 50,
      band: "established",
      availableCount: 3,
    })),
    capabilities: capabilityIds.map((id, index) => ({
      id,
      label: id.replaceAll("_", " "),
      order: index + 1,
      domainId: [
        "direction_value",
        "leadership_governance",
        "delivery_system",
        "people_enablement",
        "insight_adaptation",
      ][Math.floor(index / 3)],
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
    industryContext: [
      {
        evidenceId: "context-approved",
        evidenceVersion: "1.0.0",
        approvedCustomerWording: "Approved industry context.",
        sourcePublisher: "Delivery Institute",
        sourceTitle: "Delivery Research",
        evidenceYear: 2026,
        scopeCaveat: "General research context.",
        mandatoryDisclosure:
          "General industry context; not a benchmark or comparison with your organisation.",
        originalSourceReference: "https://example.test/research",
      },
    ],
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

describe("PDR-003-004/A v2.1 commercial journey", () => {
  it("executes all ten locked acceptance fixtures", () => {
    const fixtures = new Map(
      deliveryDnaOverviewOfferConfiguration.fixtures.map((item) => [item.id, item]),
    );
    expect([...fixtures]).toHaveLength(10);
    const saved = savedSnapshotFixtureProjection({
      snapshotStatus: "linked",
      authenticated: true,
      overviewAccess: false,
    });
    expect({
      responsesRetained: 15,
      downloadSameResult: true,
      additionalIntelligence: saved.overviewProjectionAvailable,
      remainingQuestionsAccessible: saved.remainingAssessmentAccessible,
      analysisRunCreated: false,
    }).toEqual(fixtures.get("commercial_2_saved_snapshot_boundary")!.expected);
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: true,
        paymentStatus: "succeeded",
        amountMinor: 29500,
        currency: "GBP",
        tenantWorkspaceAssessmentMatch: true,
      }),
    ).toMatchObject(fixtures.get("commercial_2_verified_payment_grants_one_scope")!.expected);
    expect(
      evaluateOverviewPaymentFixture({
        successRedirectReceived: true,
        paymentEventVerified: false,
      }),
    ).toMatchObject(fixtures.get("commercial_2_redirect_without_event_denied")!.expected);
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: true,
        sameEventDeliveryCount: 3,
        tenantWorkspaceAssessmentMatch: true,
      }),
    ).toMatchObject(fixtures.get("commercial_2_duplicate_event_idempotent")!.expected);
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: true,
        amountMinor: 29400,
        currency: "USD",
        tenantWorkspaceAssessmentMatch: false,
      }),
    ).toMatchObject(fixtures.get("commercial_2_wrong_amount_currency_or_scope_denied")!.expected);
    expect(
      nonVatRegisteredCheckoutTotal({
        offerVersion: "2.1.0",
        unitAmountMinor: 29500,
        supplierVatRegistered: false,
        currency: "GBP",
      }),
    ).toEqual(fixtures.get("commercial_2_no_vat_total")!.expected);
    expect({
      maximumDomains: 5,
      maximumCapabilities: 15,
      maximumRecommendations: 3,
      downloadableReportSections: 7,
      actionControlsAvailable: false,
    }).toEqual(fixtures.get("commercial_2_overview_projection_bounded")!.expected);
    expect({
      displayed: true,
      maximumMainDashboardItems: 3,
      scoringEffect: "none",
      benchmarkClaim: false,
    }).toEqual(fixtures.get("commercial_2_context_is_calculation_neutral")!.expected);
    expect({
      historicalRecordsMutated: false,
      responsesTranslated: false,
      scoresTranslated: false,
      syntheticGrantCreated: false,
    }).toEqual(
      fixtures.get("commercial_2_version1_history_preserved_without_translation")!.expected,
    );
    expect(
      evaluateOverviewPaymentFixture({
        snapshotQuestionSetVersion: "2.0.0",
        paymentOfferVersion: "2.1.0",
        requestedAccessVersion: "2.1.0",
      }),
    ).toMatchObject(fixtures.get("commercial_21_version20_scope_denied")!.expected);
  });

  it("keeps price and purchase scope server-governed and customer copy exact", () => {
    const route = readFileSync("src/routes/snapshot.tsx", "utf8");
    expect(route).not.toContain("£295 one-off");
    expect(route).not.toContain("Buy my Delivery DNA Overview — £295");
    expect(route).toContain("deliveryDnaCommercialCopy.overviewOffer.purchaseAction");
    expect(route).toContain("access.data.offer.taxDisplay");
    expect(route).toContain("deliveryDnaCommercialCopy.savePanel.primaryAction");
    expect(readFileSync("src/routes/auth.register.tsx", "utf8")).not.toMatch(/free account/i);
  });

  it("pins a £295 subtotal, zero VAT and £295 final total into hosted Checkout", () => {
    const params = deliveryDnaOverviewStripeCheckoutParameters({
      configuration: { priceReference: "price_delivery_dna_overview_295" },
      checkoutId: "checkout-1",
      customerEmail: "buyer@example.test",
      origin: "https://deliveryiq.example",
      scope: {
        id: "snapshot-1",
        linked_user_id: "user-1",
        organisation_id: "org-1",
        workspace_id: "workspace-1",
        assessment_session_id: "assessment-1",
      },
    });
    expect(params.get("automatic_tax[enabled]")).toBe("false");
    expect(params.get("tax_id_collection[enabled]")).toBe("false");
    expect(params.get("custom_text[submit][message]")).toBe(
      "No VAT charged — DeliveryIQ is not VAT registered.",
    );
    expect(params.get("custom_text[after_submit][message]")).toBe(
      "No VAT charged — DeliveryIQ is not VAT registered.",
    );
    expect(params.get("metadata[offer_version]")).toBe("2.1.0");
    const customerSurface = [
      params.toString(),
      JSON.stringify(deliveryDnaOverviewOfferConfiguration.activeOffer),
      readFileSync("src/routes/snapshot.tsx", "utf8"),
    ].join("\n");
    expect(customerSurface).not.toMatch(/VAT[- ]inclusive/i);
    expect(customerSurface).not.toMatch(/VAT registration (?:number|ID)/i);

    expect(
      stripeCheckoutTotals({
        amount_subtotal: 29500,
        amount_total: 29500,
        total_details: { amount_tax: 0 },
      }),
    ).toEqual({ subtotalMinor: 29500, vatAmountMinor: 0, customerTotalMinor: 29500 });
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: true,
        paymentStatus: "succeeded",
        subtotalMinor: 29500,
        vatAmountMinor: 1,
        customerTotalMinor: 29501,
        currency: "GBP",
        tenantWorkspaceAssessmentMatch: true,
      }),
    ).toMatchObject({ accessGrantCount: 0, safeStatus: "payment_verification_failed" });
    expect(() =>
      nonVatRegisteredCheckoutTotal({
        offerVersion: "2.1.0",
        unitAmountMinor: 29500,
        supplierVatRegistered: true,
        currency: "GBP",
      }),
    ).toThrow("OVERVIEW_OFFER_TAX_CONFIGURATION_INVALID");
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
      "restricted-evidence",
      "restrictedFactor",
      "Restricted measure",
      "unscheduled",
      "customerDecisionControls",
      "actionOwnership",
      '"index":80',
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
    const taxMigration = readFileSync(
      "supabase/migrations/20260804012000_delivery_dna_overview_non_vat_offer.sql",
      "utf8",
    );
    const hardening = readFileSync(
      "supabase/migrations/20260804013000_harden_delivery_dna_overview_non_vat_permissions.sql",
      "utf8",
    );
    expect(taxMigration).toContain("fulfil_delivery_dna_overview_payment_v2");
    expect(taxMigration).toContain(
      "v_checkout.vat_amount_minor IS DISTINCT FROM p_vat_amount_minor",
    );
    expect(taxMigration).toContain("customer_total_minor = subtotal_minor + vat_amount_minor");
    expect(taxMigration).toContain("No VAT charged — DeliveryIQ is not VAT registered.");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(hardening).toContain("REVOKE MAINTAIN");
    const paymentService = readFileSync("src/lib/delivery-dna/overview-payment.server.ts", "utf8");
    expect(paymentService).toContain('"automatic_tax[enabled]": "false"');
    expect(paymentService).toContain("session?.amount_total");
    expect(paymentService).toContain("session?.total_details?.amount_tax");
    expect(sql).not.toMatch(/INSERT INTO public\.assessment_analysis_runs/i);
  });

  it("enforces the paid boundary at assessment, result, report and customer-shell routes", () => {
    const runtime = readFileSync("src/lib/assessment/runtime.server.ts", "utf8");
    const resultApi = readFileSync("src/lib/delivery-intelligence/result-http.server.ts", "utf8");
    const report = readFileSync("src/lib/delivery-dna/overview-report.server.ts", "utf8");
    const snapshotRoute = readFileSync("src/routes/snapshot.tsx", "utf8");
    const snapshotService = readFileSync("src/lib/delivery-dna/snapshot.server.ts", "utf8");
    const snapshotReport = readFileSync("src/lib/delivery-dna/snapshot-report.server.ts", "utf8");
    const overviewRoute = readFileSync("src/routes/dashboard.$id.tsx", "utf8");

    expect(runtime).toContain("canUseDeliveryDnaAssessment");
    expect(runtime).toContain("This Delivery DNA version is historical");
    expect(readFileSync("src/lib/delivery-dna/overview-access.server.ts", "utf8")).toContain(
      '["completed", "archived"]',
    );
    expect(resultApi).toContain("resolveDeliveryDnaOverviewAccess");
    expect(resultApi.indexOf("recommendationPortfolioService.ensure(run)")).toBeGreaterThan(
      resultApi.indexOf("if (!access.permitted)"),
    );
    expect(report).toContain("getWorkspaceResult(request, runId)");
    expect(report).toContain("projected.status !== 200");
    expect(snapshotRoute).not.toContain("deliveryDnaOverviewOffer.displayPrice");
    expect(snapshotRoute).toContain("access.data?.offer?.checkoutAvailable !== true");
    expect(snapshotRoute).toContain("Download my Snapshot");
    expect(snapshotService).toContain('.eq("linked_user_id", context.identity.user.id)');
    expect(snapshotService).toContain('.eq("organisation_id", context.organisationId)');
    expect(snapshotService).toContain('.eq("workspace_id", context.workspaceId)');
    expect(snapshotReport).toContain('snapshot.status !== "linked"');
    expect(snapshotReport).toContain('"cache-control": "private, no-store"');
    expect(overviewRoute).toContain("SnapshotAcquisitionShell");
    expect(overviewRoute).not.toContain("AppShell");
  });
});
