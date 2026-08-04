import { z } from "zod";

import rawConfiguration from "../../../docs/01-product/delivery-intelligence/configuration/PDR-003-004A v1.0.0 Delivery DNA Commercial Offer Configuration.json";

const offerSchema = z
  .object({
    document: z.object({
      id: z.literal("PDR-003-004A"),
      version: z.literal("1.0.0"),
      status: z.literal("locked"),
      parentDecisionId: z.literal("PDR-003-004"),
      parentDecisionVersion: z.literal("1.1"),
    }),
    activeOffer: z.object({
      offerId: z.literal("delivery-dna-overview-gbp-1"),
      offerVersion: z.literal("1.0.0"),
      productId: z.literal("delivery-dna-overview"),
      productVersion: z.literal("1.0.0"),
      accessKey: z.literal("delivery_dna_overview"),
      accessVersion: z.literal("1.0.0"),
      status: z.literal("active"),
      effectiveFrom: z.iso.datetime(),
      effectiveUntil: z.iso.datetime().nullable(),
      chargeType: z.literal("one_off"),
      currency: z.literal("GBP"),
      unitAmountMinor: z.literal(29500),
      displayPrice: z.literal("£295 one-off"),
      taxPolicy: z.literal("checkout_discloses_final_total_and_applicable_tax_before_confirmation"),
      providerPriceReferenceSource: z.literal("deployment_configuration"),
      clientSuppliedPriceTrusted: z.literal(false),
    }),
    purchaseScope: z
      .object({
        assessmentType: z.literal("delivery-dna"),
        assessmentVersion: z.literal("1.0.0"),
        questionSetVersion: z.literal("1.0.0"),
        capabilityCount: z.literal(13),
        questionCount: z.literal(39),
        remainingQuestionCountAfterSnapshot: z.literal(26),
        overviewAssessmentsPerPurchase: z.literal(1),
        deliveryDnaActionIncluded: z.literal(false),
        knowledgePackIncluded: z.literal(false),
        teamMateIncluded: z.literal(false),
      })
      .passthrough(),
    fulfilmentPolicy: z.object({
      grantAuthority: z.literal("verified_payment_provider_event_only"),
      successRedirectGrantsAccess: z.literal(false),
      serverVerificationRequired: z.literal(true),
      idempotentEventProcessingRequired: z.literal(true),
      eventReplaySafe: z.literal(true),
      offerVersionPinnedToCheckout: z.literal(true),
      offerVersionPinnedToPayment: z.literal(true),
      offerVersionPinnedToAccessGrant: z.literal(true),
      tenantAndWorkspaceMatchRequired: z.literal(true),
      assessmentMatchRequired: z.literal(true),
      cardDataStoredByDeliveryIq: z.literal(false),
      failedOrCancelledPaymentGrantsAccess: z.literal(false),
      priceMismatchGrantsAccess: z.literal(false),
    }),
    savedSnapshotProjection: z.object({
      allowed: z.array(z.string()),
      prohibited: z.array(z.string()),
      mayCompleteFullAssessment: z.literal(false),
      mayRequestAnalysis: z.literal(false),
    }),
    overviewProjection: z.object({
      allowed: z.array(z.string()),
      prohibited: z.array(z.string()),
      calculationSource: z.literal("immutable_delivery_intelligence_result"),
      commercialRecalculationAllowed: z.literal(false),
      webAndDownloadProjectionMustMatch: z.literal(true),
    }),
    industryContextPolicy: z.object({
      catalogueId: z.literal("DIQ-204A"),
      minimumCatalogueVersion: z.literal("1.1.0"),
      eligibility: z.literal("approved_for_customer_context_and_materially_relevant"),
      requiredFields: z.array(z.string()),
      scoringEffect: z.literal("none"),
      confidenceEffect: z.literal("none"),
      rankingEffect: z.literal("none"),
      roadmapEffect: z.literal("none"),
      crossOrganisationComparisonAllowed: z.literal(false),
      matchedBenchmarkClaimAllowed: z.literal(false),
      causalClaimAllowed: z.literal(false),
    }),
    customerCopy: z.object({
      savePanel: z.object({
        heading: z.literal("Keep your Delivery DNA"),
        body: z.literal(
          "Create your secure DeliveryIQ workspace to save your Snapshot, return to your results and continue to your complete Delivery DNA Overview.",
        ),
        primaryAction: z.literal("Save my Snapshot"),
      }),
      savedState: z.object({
        heading: z.literal("Your Snapshot is saved"),
        body: z.literal(
          "Your 13 responses are secure in your DeliveryIQ workspace. Unlock your complete Delivery DNA Overview to assess all 39 questions and receive your capability profile, evidence confidence, priority recommendations and executive report.",
        ),
        primaryAction: z.literal("Unlock my Delivery DNA Overview — £295"),
      }),
      overviewOffer: z.object({
        heading: z.literal("Understand what is enabling—and constraining—delivery"),
        body: z.literal(
          "Complete the remaining 26 questions to receive an evidence-linked view of your organisation's delivery capability, the areas that matter most and the priorities to address first.",
        ),
        priceLabel: z.literal("£295 one-off"),
        purchaseAction: z.literal("Buy my Delivery DNA Overview — £295"),
      }),
      purchasedState: z.object({ primaryAction: z.literal("Continue my Delivery DNA") }),
      prohibitedPrimaryTerms: z.array(z.string()),
      prohibitedClaims: z.array(z.string()),
    }),
    legacyPolicy: z.object({
      preserveExistingSnapshotResponses: z.literal(true),
      preserveExistingLinkedDrafts: z.literal(true),
      preserveExistingCompletedAssessments: z.literal(true),
      preserveExistingResults: z.literal(true),
      preserveExistingAnalysisHistory: z.literal(true),
      removeGenuineCustomerAccessRetroactively: z.literal(false),
      syntheticBackfillAllowed: z.literal(false),
    }),
    fixtures: z
      .array(
        z.object({
          id: z.string(),
          input: z.record(z.string(), z.unknown()),
          expected: z.record(z.string(), z.unknown()),
        }),
      )
      .length(11),
  })
  .passthrough();

export type DeliveryDnaOverviewOfferConfiguration = z.infer<typeof offerSchema>;

export function validateDeliveryDnaOverviewOfferConfiguration(
  value: unknown,
): DeliveryDnaOverviewOfferConfiguration {
  const parsed = offerSchema.parse(value);
  const fixtureIds = parsed.fixtures.map((fixture) => fixture.id);
  if (new Set(fixtureIds).size !== 11) throw new Error("OVERVIEW_OFFER_CONFIGURATION_INVALID");
  return parsed;
}

export const deliveryDnaOverviewOfferConfiguration = Object.freeze(
  validateDeliveryDnaOverviewOfferConfiguration(rawConfiguration),
);

export const deliveryDnaOverviewOffer = deliveryDnaOverviewOfferConfiguration.activeOffer;
export const deliveryDnaCommercialCopy = deliveryDnaOverviewOfferConfiguration.customerCopy;

export function activeDeliveryDnaOverviewOffer(now = new Date().toISOString()) {
  const instant = Date.parse(now);
  const start = Date.parse(deliveryDnaOverviewOffer.effectiveFrom);
  const end = deliveryDnaOverviewOffer.effectiveUntil
    ? Date.parse(deliveryDnaOverviewOffer.effectiveUntil)
    : null;
  return deliveryDnaOverviewOffer.status === "active" &&
    instant >= start &&
    (end === null || instant < end)
    ? deliveryDnaOverviewOffer
    : null;
}

export function savedSnapshotFixtureProjection(input: {
  snapshotStatus: "completed" | "linked";
  authenticated: boolean;
  overviewAccess: boolean;
}) {
  const copy = deliveryDnaCommercialCopy;
  if (!input.authenticated || input.snapshotStatus === "completed") {
    return {
      heading: copy.savePanel.heading,
      primaryAction: copy.savePanel.primaryAction,
      overviewProjectionAvailable: false,
      analysisRunCreated: false,
    };
  }
  return {
    heading: copy.savedState.heading,
    primaryAction: input.overviewAccess
      ? copy.purchasedState.primaryAction
      : copy.savedState.primaryAction,
    displayPrice: deliveryDnaOverviewOffer.displayPrice,
    remainingAssessmentAccessible: input.overviewAccess,
    overviewProjectionAvailable: false,
  };
}

export function evaluateOverviewPaymentFixture(input: {
  paymentEventVerified?: boolean;
  paymentStatus?: string;
  amountMinor?: number;
  currency?: string;
  tenantWorkspaceAssessmentMatch?: boolean;
  successRedirectReceived?: boolean;
  sameEventDeliveryCount?: number;
}) {
  const offer = deliveryDnaOverviewOffer;
  if (!input.paymentEventVerified) {
    return {
      accessGrantCount: 0,
      remainingAssessmentAccessible: false,
      safeStatus: input.successRedirectReceived
        ? "payment_confirmation_pending"
        : "payment_verification_failed",
    };
  }
  const valid =
    input.paymentStatus !== "failed" &&
    input.paymentStatus !== "cancelled" &&
    (input.amountMinor === undefined || input.amountMinor === offer.unitAmountMinor) &&
    (input.currency === undefined || input.currency === offer.currency) &&
    input.tenantWorkspaceAssessmentMatch === true;
  if (!valid) {
    return {
      accessGrantCount: 0,
      remainingAssessmentAccessible: false,
      safeStatus: "payment_verification_failed",
    };
  }
  return {
    accessGrantCount: 1,
    chargeFulfilmentCount: 1,
    accessKey: offer.accessKey,
    accessVersion: offer.accessVersion,
    remainingAssessmentAccessible: true,
    deliveryDnaActionAccessible: false,
  };
}

export function historicalOverviewPurchase<
  T extends {
    checkoutOfferVersion: string;
    checkoutAmountMinor: number;
  },
>(input: T) {
  return {
    historicalPaymentOfferVersion: input.checkoutOfferVersion,
    historicalPaymentAmountMinor: input.checkoutAmountMinor,
    historicalAccessChanged: false,
  };
}
