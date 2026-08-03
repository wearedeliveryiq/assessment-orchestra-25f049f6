export const DELIVERY_DNA_COMMERCIAL_POLICY = {
  id: "PDR-003-004",
  version: "1.0",
  productType: "delivery_dna_action",
  productId: "delivery_dna_action",
  entitlementVersion: "1.0.0",
  anonymousRegistrationLabel:
    "Create your free DeliveryIQ account to explore your complete Delivery DNA profile, priority recommendations and personalised roadmap preview.",
  panel: {
    heading: "Turn your Delivery DNA priorities into action",
    body: "Unlock your complete improvement plan, success measures and action tracking to help your team deliver and evidence progress.",
    contactAction: "Talk to DeliveryIQ",
    unavailable: "DeliveryIQ's complete improvement-planning experience is coming soon.",
    entitledAction: "Open improvement plan",
  },
} as const;

export interface DeliveryDnaAvailabilityRecord {
  productType: string;
  productId: string;
  productVersion: string | null;
  status: string;
}

export interface DeliveryDnaEntitlementRecord {
  organisationId: string;
  workspaceId: string | null;
  productType: string;
  productId: string;
  productVersion: string | null;
  entitled: boolean;
  validFrom: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface DeliveryDnaCommercialAccessDecision {
  policyId: typeof DELIVERY_DNA_COMMERCIAL_POLICY.id;
  policyVersion: typeof DELIVERY_DNA_COMMERCIAL_POLICY.version;
  productId: typeof DELIVERY_DNA_COMMERCIAL_POLICY.productId;
  entitlementVersion: typeof DELIVERY_DNA_COMMERCIAL_POLICY.entitlementVersion;
  evaluatedEntitlementVersion: string | null;
  available: boolean;
  entitled: boolean;
  permitted: boolean;
  accessTier: "free" | "entitled";
  state: "unavailable" | "not_entitled" | "not_permitted" | "entitled";
  panel: {
    heading: string;
    body: string;
    message: string | null;
    action: { label: string; destination: string } | null;
  };
}

export function approvedCommercialContactRoute(value: string | null | undefined): string | null {
  const route = value?.trim() ?? "";
  if (!route.startsWith("/") || route.startsWith("//")) return null;
  const url = new URL(route, "https://deliveryiq.invalid");
  url.searchParams.set("source", "delivery-dna-result");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function evaluateDeliveryDnaCommercialAccess(input: {
  organisationId: string;
  workspaceId: string;
  availability: DeliveryDnaAvailabilityRecord | null;
  entitlement: DeliveryDnaEntitlementRecord | null;
  permitted: boolean;
  now?: string;
  commercialContactRoute?: string | null;
}): DeliveryDnaCommercialAccessDecision {
  const policy = DELIVERY_DNA_COMMERCIAL_POLICY;
  const now = Date.parse(input.now ?? new Date().toISOString());
  const availability = input.availability;
  const available = Boolean(
    availability &&
    availability.productType === policy.productType &&
    availability.productId === policy.productId &&
    availability.productVersion === policy.entitlementVersion &&
    availability.status === "active",
  );
  const entitlement = input.entitlement;
  const validFrom = entitlement?.validFrom ? Date.parse(entitlement.validFrom) : null;
  const expiresAt = entitlement?.expiresAt ? Date.parse(entitlement.expiresAt) : null;
  const entitled = Boolean(
    entitlement &&
    entitlement.organisationId === input.organisationId &&
    (entitlement.workspaceId === null || entitlement.workspaceId === input.workspaceId) &&
    entitlement.productType === policy.productType &&
    entitlement.productId === policy.productId &&
    entitlement.productVersion === policy.entitlementVersion &&
    entitlement.entitled &&
    entitlement.revokedAt === null &&
    (validFrom === null || (Number.isFinite(validFrom) && validFrom <= now)) &&
    (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now)),
  );
  const granted = available && entitled && input.permitted;
  const state = granted
    ? "entitled"
    : !available
      ? "unavailable"
      : !entitled
        ? "not_entitled"
        : "not_permitted";
  const contactRoute = approvedCommercialContactRoute(input.commercialContactRoute);
  const action = granted
    ? { label: policy.panel.entitledAction, destination: "#delivery-dna-improvement-plan" }
    : available && !entitled && contactRoute
      ? { label: policy.panel.contactAction, destination: contactRoute }
      : null;
  return {
    policyId: policy.id,
    policyVersion: policy.version,
    productId: policy.productId,
    entitlementVersion: policy.entitlementVersion,
    evaluatedEntitlementVersion: entitlement?.productVersion ?? null,
    available,
    entitled,
    permitted: input.permitted,
    accessTier: granted ? "entitled" : "free",
    state,
    panel: {
      heading: policy.panel.heading,
      body: policy.panel.body,
      message: state === "unavailable" ? policy.panel.unavailable : null,
      action,
    },
  };
}
