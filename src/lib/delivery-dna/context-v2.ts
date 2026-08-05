import rawEvidence from "../../../docs/01-product/delivery-intelligence/configuration/DIQ-204A Delivery Evidence Catalogue.json";

const MANDATORY_DISCLOSURE =
  "Industry research only — not a benchmark or a comparison with your organisation.";

type ContextSurface = "snapshot_context" | "overview_context" | "report_context";

type ContextItem = {
  id: string;
  version: string;
  sourceId: string;
  status: string;
  approvedCustomerWording: string;
  permittedUses: string[];
  scoringEffect: string;
  reviewBy: string;
  domainIds?: string[];
  capabilityIds?: string[];
  mappingPriority?: number;
  customerSourceNote?: string;
  snapshotDomainPriorities?: Record<string, number>;
};
type ContextProjection = {
  evidenceId: string;
  evidenceVersion: string;
  approvedCustomerWording: string;
  footnoteMarker: string;
  sourcePublisher: string;
  sourceTitle: string;
  sourceNote: string;
  originalSourceReference: string;
  evidenceYear: number;
  scopeCaveat: string;
  selectionReason: string;
  mandatoryDisclosure: string;
};

const sourceById = new Map(rawEvidence.sources.map((source) => [source.id, source]));
const contextItems = rawEvidence.evidenceItems as unknown as ContextItem[];

export function deliveryDnaContextEligible(
  item: ContextItem,
  surface: ContextSurface,
  evidenceSnapshotAt = rawEvidence.document.evidenceSnapshotAt,
): boolean {
  return (
    item.status === "approved_for_customer_context" &&
    item.permittedUses.includes(surface) &&
    item.scoringEffect === "none" &&
    Date.parse(item.reviewBy) >= Date.parse(evidenceSnapshotAt)
  );
}

function project(item: ContextItem, index: number, reason: string): ContextProjection {
  const source = sourceById.get(item.sourceId);
  if (!source) throw new Error("DELIVERY_DNA_CONTEXT_SOURCE_INVALID");
  return {
    evidenceId: item.id,
    evidenceVersion: item.version,
    approvedCustomerWording: item.approvedCustomerWording,
    footnoteMarker: index === 0 ? "*" : String(index + 1),
    sourcePublisher: source.publisher,
    sourceTitle: source.title,
    sourceNote:
      item.customerSourceNote ??
      `* ${source.publisher}, ${source.title} ${Number(source.publishedAt.slice(0, 4))}`,
    originalSourceReference: source.url,
    evidenceYear: Number(source.publishedAt.slice(0, 4)),
    scopeCaveat: source.context,
    selectionReason: reason,
    mandatoryDisclosure: MANDATORY_DISCLOSURE,
  };
}

export function selectSnapshotContext(domainId: string): ContextProjection[] {
  const selected = contextItems
    .filter(
      (item) =>
        deliveryDnaContextEligible(item, "snapshot_context") && item.domainIds?.includes(domainId),
    )
    .sort(
      (left, right) =>
        (left.snapshotDomainPriorities?.[domainId] ??
          left.mappingPriority ??
          Number.MAX_SAFE_INTEGER) -
          (right.snapshotDomainPriorities?.[domainId] ??
            right.mappingPriority ??
            Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id),
    )
    .slice(0, 1);
  return selected.map((item, index) => project(item, index, `mapped_to_domain:${domainId}`));
}

export function selectOverviewContext(input: {
  domainIds: string[];
  capabilityIds: string[];
}): ContextProjection[] {
  const domainSet = new Set(input.domainIds);
  const capabilitySet = new Set(input.capabilityIds);
  const selected = contextItems
    .filter(
      (item) =>
        deliveryDnaContextEligible(item, "overview_context") &&
        (item.domainIds?.some((id) => domainSet.has(id)) ||
          item.capabilityIds?.some((id) => capabilitySet.has(id))),
    )
    .slice(0, 3);
  return selected.map((item, index) => project(item, index, "mapped_to_displayed_result"));
}

export { MANDATORY_DISCLOSURE as DELIVERY_DNA_CONTEXT_DISCLOSURE };
