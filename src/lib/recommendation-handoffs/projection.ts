import type { ProductHandoffRecord } from "./types";

export function projectProductHandoff(record: ProductHandoffRecord) {
  return {
    handoffId: record.id,
    sourceActionId: record.sourceActionId,
    targetType: record.targetType,
    targetId: record.targetId,
    targetVersion: record.targetVersion,
    cta: record.cta,
    consentBasis: record.consentBasis,
    consentedAt: record.consentedAt,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
  };
}
