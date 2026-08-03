import type { OutcomeMeasureRecord, RecommendationActionOutcome } from "./types";

export const OUTCOME_ASSOCIATION_COPY =
  "Observed progress is associated with this action. It does not prove that DeliveryIQ or the recommendation caused the outcome.";

export function projectRecommendationOutcome(
  outcome: RecommendationActionOutcome,
  records: OutcomeMeasureRecord[],
  audience: "workspace" | "audit" | "executive",
) {
  const measures = records.map((record) => {
    const common = {
      measureId: record.measure.measureId,
      measureVersionId: record.measure.id,
      version: record.measure.version,
      direction: record.measure.direction,
      unit: record.measure.unit,
      decimalScale: record.measure.decimalScale,
      baselineValue: record.measure.baselineValue,
      targetValue: record.measure.targetValue,
      tolerance: record.measure.tolerance,
      targetDate: record.measure.targetDate,
      targetTimezone: record.measure.targetTimezone,
      cadence: record.measure.cadence,
      accountableOwnerId: record.measure.accountableOwnerId,
      current: record.current,
    };
    if (audience === "workspace")
      return {
        ...common,
        baselineEffectiveAt: record.measure.baselineEffectiveAt,
        sourceDescription: record.measure.sourceDescription,
        observations: record.observations.map((observation) => ({
          id: observation.id,
          value: observation.value,
          effectiveAt: observation.effectiveAt,
          recordedAt: observation.recordedAt,
          sourceDescription: observation.sourceDescription,
          supersedesObservationId: observation.supersedesObservationId,
          correctionReason: observation.correctionReason,
          corrected: record.observations.some(
            (candidate) => candidate.supersedesObservationId === observation.id,
          ),
        })),
      };
    if (audience === "executive") {
      return {
        measureId: common.measureId,
        version: common.version,
        status: common.current.status,
        reasonCode: common.current.reasonCode,
        satisfactionTiming: common.current.satisfactionTiming,
        deadlineWasMissed: common.current.deadlineWasMissed,
        customerCopy: common.current.customerCopy,
      };
    }
    return {
      ...common,
      sourceDescription: record.measure.sourceDescription,
      sourceReference: record.measure.sourceReference,
      policyVersion: record.measure.policyVersion,
      evaluatorVersion: record.measure.evaluatorVersion,
      observations: record.observations,
      history: record.history,
    };
  });
  return {
    outcomeId: outcome.id,
    actionId: outcome.actionId,
    recommendationId: outcome.recommendationId,
    recommendationVersion: outcome.recommendationVersion,
    intendedOutcome: outcome.intendedOutcome,
    successMeasureTemplates: outcome.successMeasureTemplates,
    associationNotice: OUTCOME_ASSOCIATION_COPY,
    policyVersion: outcome.policyVersion,
    measures,
    ...(audience === "audit"
      ? {
          organisationId: outcome.organisationId,
          workspaceId: outcome.workspaceId,
          portfolioItemId: outcome.portfolioItemId,
          recommendationDefinitionId: outcome.recommendationDefinitionId,
          catalogueVersionId: outcome.catalogueVersionId,
          catalogueVersion: outcome.catalogueVersion,
          catalogueDigest: outcome.catalogueDigest,
        }
      : {}),
  };
}
