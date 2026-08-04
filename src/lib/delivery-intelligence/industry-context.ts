import { z } from "zod";

import rawCatalogue from "../../../docs/01-product/delivery-intelligence/configuration/DIQ-204A Delivery Evidence Catalogue.json";

const sourceSchema = z.object({
  id: z.string(),
  publisher: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  url: z.url(),
  context: z.string(),
});
const itemSchema = z.object({
  id: z.string(),
  version: z.string(),
  sourceId: z.string(),
  status: z.string(),
  approvedCustomerWording: z.string(),
  prohibitedInference: z.string(),
  capabilityIds: z.array(z.string()),
  scoringEffect: z.literal("none"),
});
const catalogueSchema = z.object({
  document: z.object({ id: z.literal("DIQ-204A"), version: z.literal("1.1.0") }),
  policy: z.object({ scoringEffect: z.literal("none") }).passthrough(),
  sources: z.array(sourceSchema),
  evidenceItems: z.array(itemSchema),
});

const catalogue = catalogueSchema.parse(rawCatalogue);

export interface OverviewIndustryContextItem {
  id: string;
  approvedCustomerSafeWording: string;
  publisher: string;
  evidenceYear: string;
  originalSourceReference: string;
  scopeOrMethodCaveat: string;
  notCustomerPredictionCaveat: string;
}

export function projectOverviewIndustryContext(
  materiallyRelevantCapabilityIds: string[],
  maximumItems = 3,
): OverviewIndustryContextItem[] {
  const relevant = new Set(materiallyRelevantCapabilityIds);
  const sources = new Map(catalogue.sources.map((source) => [source.id, source]));
  return catalogue.evidenceItems
    .filter(
      (item) =>
        item.status === "approved_for_customer_context" &&
        item.scoringEffect === "none" &&
        item.capabilityIds.some((capabilityId) => relevant.has(capabilityId)),
    )
    .flatMap((item) => {
      const source = sources.get(item.sourceId);
      if (!source) return [];
      return [
        {
          id: item.id,
          approvedCustomerSafeWording: item.approvedCustomerWording,
          publisher: source.publisher,
          evidenceYear: source.publishedAt.slice(0, 4),
          originalSourceReference: source.url,
          scopeOrMethodCaveat: source.context,
          notCustomerPredictionCaveat:
            "This is contextual evidence, not a prediction, benchmark or causal explanation of your organisation's result.",
        },
      ];
    })
    .slice(0, maximumItems);
}
