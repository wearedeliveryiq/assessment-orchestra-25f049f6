import { z } from "zod";

import rawConfiguration from "../../../docs/01-product/delivery-intelligence/configuration/PDR-003-004A v2.1.0 Delivery DNA Commercial Offer Configuration.json";

const offerSchema = z
  .object({
    document: z.object({
      id: z.literal("PDR-003-004A"),
      version: z.literal("2.1.0"),
      status: z.literal("locked"),
      parentDecisionId: z.literal("PDR-003-004"),
      parentDecisionVersion: z.literal("2.1"),
    }),
    activeOffer: z.object({
      offerId: z.literal("delivery-dna-overview-gbp-21"),
      offerVersion: z.literal("2.1.0"),
      productId: z.literal("delivery-dna-overview"),
      productVersion: z.literal("2.1.0"),
      accessKey: z.literal("delivery_dna_overview"),
      accessVersion: z.literal("2.1.0"),
      status: z.literal("active_at_delivery_dna_21_cutover"),
      chargeType: z.literal("one_off"),
      currency: z.literal("GBP"),
      unitAmountMinor: z.literal(29500),
      displayPrice: z.literal("£295 one-off"),
      taxPolicy: z.literal("no_vat_charged_supplier_not_vat_registered"),
      providerPriceReferenceSource: z.literal("deployment_configuration"),
      clientSuppliedPriceTrusted: z.literal(false),
      taxStatus: z.literal("supplier_not_vat_registered"),
      vatCharged: z.literal(false),
      vatAmountMinor: z.literal(0),
      customerTotalMinor: z.literal(29500),
      taxDisplay: z.literal("No VAT charged — DeliveryIQ is not VAT registered."),
    }),
    purchaseScope: z
      .object({
        assessmentType: z.literal("delivery-dna"),
        assessmentVersion: z.literal("2.1.0"),
        questionSetVersion: z.literal("2.1.0"),
        capabilityCount: z.literal(15),
        questionCount: z.literal(45),
        remainingQuestionCountAfterSnapshot: z.literal(30),
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
      minimumCatalogueVersion: z.literal("1.2.0"),
      eligibility: z.literal("approved_for_customer_context_and_materially_relevant"),
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
        heading: z.literal("Keep your Delivery DNA Snapshot"),
        body: z.literal(
          "Save your Snapshot for free to download your results, return at any time and continue to your complete Delivery DNA without starting again.",
        ),
        supportingMessage: z.literal("Download your results by saving your Snapshot"),
        primaryAction: z.literal("Save my Snapshot"),
        assuranceLine: z.literal("Free to save. No payment required. Your results remain private."),
      }),
      savedState: z.object({
        heading: z.literal("Your Snapshot is saved"),
        body: z.literal(
          "Your 15 responses are secure in your DeliveryIQ workspace. Unlock your complete Delivery DNA Overview to assess all 45 questions and receive your five-domain profile, fifteen-capability diagnosis, evidence confidence, priority recommendations and executive report.",
        ),
        primaryAction: z.literal("Unlock your complete Delivery DNA — £295"),
      }),
      overviewOffer: z.object({
        heading: z.literal("Understand what is enabling—and constraining—delivery"),
        body: z.literal(
          "Complete the remaining 30 questions to receive an evidence-linked view of your organisation's delivery capability, the areas that matter most and the priorities to address first.",
        ),
        priceLabel: z.literal("£295 one-off"),
        purchaseAction: z.literal("Buy my Delivery DNA Overview — £295"),
      }),
      purchasedState: z.object({ primaryAction: z.literal("Continue my Delivery DNA") }),
      prohibitedPrimaryTerms: z.array(z.string()),
      prohibitedClaims: z.array(z.string()),
    }),
    fixtures: z
      .array(
        z.object({
          id: z.string(),
          input: z.record(z.string(), z.unknown()),
          expected: z.record(z.string(), z.unknown()),
        }),
      )
      .length(10),
  })
  .passthrough();

export type DeliveryDnaOverviewOfferConfiguration = z.infer<typeof offerSchema>;

export function validateDeliveryDnaOverviewOfferConfiguration(
  value: unknown,
): DeliveryDnaOverviewOfferConfiguration {
  const parsed = offerSchema.parse(value);
  const fixtureIds = parsed.fixtures.map((fixture) => fixture.id);
  if (new Set(fixtureIds).size !== 10) throw new Error("OVERVIEW_OFFER_CONFIGURATION_INVALID");
  return parsed;
}

export const deliveryDnaOverviewOfferConfiguration = Object.freeze(
  validateDeliveryDnaOverviewOfferConfiguration(rawConfiguration),
);

export const deliveryDnaOverviewOffer = deliveryDnaOverviewOfferConfiguration.activeOffer;
export const deliveryDnaCommercialCopy = deliveryDnaOverviewOfferConfiguration.customerCopy;

export function activeDeliveryDnaOverviewOffer(now = new Date().toISOString()) {
  void now;
  return deliveryDnaOverviewOffer.status === "active_at_delivery_dna_21_cutover"
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
  subtotalMinor?: number;
  vatAmountMinor?: number;
  customerTotalMinor?: number;
  snapshotQuestionSetVersion?: string;
  paymentOfferVersion?: string;
  requestedAccessVersion?: string;
}) {
  const offer = deliveryDnaOverviewOffer;
  if (
    (input.snapshotQuestionSetVersion !== undefined &&
      input.snapshotQuestionSetVersion !==
        deliveryDnaOverviewOfferConfiguration.purchaseScope.questionSetVersion) ||
    (input.paymentOfferVersion !== undefined && input.paymentOfferVersion !== offer.offerVersion) ||
    (input.requestedAccessVersion !== undefined &&
      input.requestedAccessVersion !== offer.accessVersion)
  ) {
    return {
      accessGrantCount: 0,
      responsesTranslated: false,
      remainingAssessmentAccessible: false,
      safeStatus: "assessment_version_mismatch",
    };
  }
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
    (input.subtotalMinor === undefined || input.subtotalMinor === offer.unitAmountMinor) &&
    (input.vatAmountMinor === undefined || input.vatAmountMinor === offer.vatAmountMinor) &&
    (input.customerTotalMinor === undefined ||
      input.customerTotalMinor === offer.customerTotalMinor) &&
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
    remainingQuestionsAccessible:
      deliveryDnaOverviewOfferConfiguration.purchaseScope.remainingQuestionCountAfterSnapshot,
    deliveryDnaActionAccessible: false,
  };
}

export function nonVatRegisteredCheckoutTotal(input: {
  offerVersion: string;
  unitAmountMinor: number;
  supplierVatRegistered: boolean;
  currency: string;
}) {
  const offer = deliveryDnaOverviewOffer;
  if (
    input.offerVersion !== offer.offerVersion ||
    input.unitAmountMinor !== offer.unitAmountMinor ||
    input.supplierVatRegistered ||
    input.currency !== offer.currency
  ) {
    throw new Error("OVERVIEW_OFFER_TAX_CONFIGURATION_INVALID");
  }
  return {
    subtotalMinor: offer.unitAmountMinor,
    vatAmountMinor: offer.vatAmountMinor,
    customerTotalMinor: offer.customerTotalMinor,
    taxDisplay: offer.taxDisplay,
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
