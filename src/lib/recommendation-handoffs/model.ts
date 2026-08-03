import { mapKnowledgePacks, mapTeamMates } from "../delivery-intelligence/mappings";

export const productHandoffCtas = [
  "start_assessment",
  "view_pack",
  "review_activation",
  "view_teammate",
] as const;
export type ProductHandoffCta = (typeof productHandoffCtas)[number];
export type ProductHandoffTargetType = "knowledge_pack" | "teammate";

function isProductHandoffCta(value: string): value is ProductHandoffCta {
  return productHandoffCtas.some((cta) => cta === value);
}

export interface ProductOperationalState {
  targetType: ProductHandoffTargetType;
  targetId: string;
  targetVersion: string | null;
  status: "active" | "inactive" | "unavailable";
  entitled: boolean;
  activated: boolean;
}

export interface ProductHandoffOpportunity {
  targetType: ProductHandoffTargetType;
  targetId: string;
  targetVersion: string;
  cta: ProductHandoffCta | null;
  copy: string;
  domainEligible: true;
  available: true;
  entitled: boolean;
  permitted: boolean;
  activated: boolean;
}

export class ProductHandoffError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function resolveProductHandoffOpportunities(input: {
  recommendationId: string;
  recommendationAccepted: boolean;
  permissions: readonly string[];
  products: ProductOperationalState[];
}): ProductHandoffOpportunity[] {
  const byProduct = new Map(
    input.products.map((product) => [`${product.targetType}:${product.targetId}`, product]),
  );
  const packs = mapKnowledgePacks(
    { [input.recommendationId]: 1 },
    Object.fromEntries(
      input.products
        .filter((product) => product.targetType === "knowledge_pack")
        .map((product) => [
          product.targetId,
          { status: product.status, entitled: product.entitled },
        ]),
    ),
  ).flatMap((mapped) => {
    const product = byProduct.get(`knowledge_pack:${mapped.id}`);
    if (!product?.targetVersion || product.status !== "active" || !isProductHandoffCta(mapped.cta))
      return [];
    const permitted = mapped.cta === "view_pack" || input.permissions.includes("assessment:create");
    return [
      {
        targetType: "knowledge_pack" as const,
        targetId: mapped.id,
        targetVersion: product.targetVersion,
        cta: product.activated ? null : permitted ? mapped.cta : null,
        copy: mapped.copy,
        domainEligible: true as const,
        available: true as const,
        entitled: product.entitled,
        permitted,
        activated: product.activated,
      },
    ];
  });
  const teamMates = mapTeamMates({
    acceptedRecommendations: input.recommendationAccepted ? [input.recommendationId] : [],
    authenticated: true,
    permission: input.permissions.includes("teammate.activate") ? "teammate.activate" : "",
    catalogue: Object.fromEntries(
      input.products
        .filter((product) => product.targetType === "teammate")
        .map((product) => [
          product.targetId,
          { available: product.status === "active", entitled: product.entitled },
        ]),
    ),
  }).flatMap((mapped) => {
    const product = byProduct.get(`teammate:${mapped.id}`);
    if (!product?.targetVersion || product.status !== "active" || !isProductHandoffCta(mapped.cta))
      return [];
    const permitted = !product.entitled || input.permissions.includes("teammate.activate");
    const cta = product.entitled && !permitted ? null : mapped.cta;
    return [
      {
        targetType: "teammate" as const,
        targetId: mapped.id,
        targetVersion: product.targetVersion,
        cta: product.activated ? null : cta,
        copy: mapped.copy,
        domainEligible: true as const,
        available: true as const,
        entitled: product.entitled,
        permitted,
        activated: product.activated,
      },
    ];
  });
  return [...packs, ...teamMates];
}

export function requireHandoffOpportunity(
  opportunities: ProductHandoffOpportunity[],
  target: {
    targetType: ProductHandoffTargetType;
    targetId: string;
    targetVersion: string;
    cta: ProductHandoffCta;
  },
) {
  const opportunity = opportunities.find(
    (candidate) =>
      candidate.targetType === target.targetType &&
      candidate.targetId === target.targetId &&
      candidate.targetVersion === target.targetVersion &&
      candidate.cta === target.cta,
  );
  if (!opportunity || !opportunity.permitted || opportunity.activated) {
    throw new ProductHandoffError(
      "PRODUCT_HANDOFF_NOT_AVAILABLE",
      "This next step is not currently available.",
    );
  }
  return opportunity;
}
