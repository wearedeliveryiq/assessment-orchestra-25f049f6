export const OUTCOME_POLICY_VERSION = "PDR-004-001/1.0";
export const OUTCOME_EVALUATOR_VERSION = "deliveryiq.outcome-measurement/1.0.0";

export const outcomeDirections = ["increase", "decrease", "maintain", "binary"] as const;
export type OutcomeDirection = (typeof outcomeDirections)[number];

export const outcomeStatuses = [
  "not_measured",
  "baseline_recorded",
  "tracking",
  "target_met",
  "target_not_met",
  "retired",
] as const;
export type OutcomeStatus = (typeof outcomeStatuses)[number];

export const outcomeReasonCodes = [
  "measure_configuration_incomplete",
  "baseline_missing",
  "baseline_only",
  "target_satisfied",
  "target_satisfied_late",
  "target_pending",
  "target_not_met_by_date",
  "no_observation_by_target_date",
  "measure_retired",
] as const;
export type OutcomeReasonCode = (typeof outcomeReasonCodes)[number];

export type OutcomeValue = { kind: "numeric"; value: string } | { kind: "binary"; value: boolean };

export interface RecommendationActionOutcome {
  id: string;
  actionId: string;
  organisationId: string;
  workspaceId: string;
  portfolioItemId: string;
  recommendationDefinitionId: string;
  recommendationId: string;
  recommendationVersion: string;
  catalogueVersionId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  intendedOutcome: string;
  successMeasureTemplates: string[];
  policyVersion: typeof OUTCOME_POLICY_VERSION;
  createdByUserId: string;
  createdAt: string;
}

export interface OutcomeMeasureVersion {
  id: string;
  outcomeId: string;
  measureId: string;
  version: number;
  organisationId: string;
  workspaceId: string;
  actionId: string;
  sourceRecommendationId: string;
  sourceRecommendationVersion: string;
  sourceCatalogueVersionId: string;
  sourceCatalogueVersion: string;
  sourceCatalogueDigest: string;
  direction: OutcomeDirection;
  unit: string;
  decimalScale: number;
  baselineValue: OutcomeValue | null;
  baselineEffectiveAt: string | null;
  targetValue: OutcomeValue | null;
  tolerance: string | null;
  targetDate: string | null;
  targetTimezone: string | null;
  targetDeadlineAt: string | null;
  sourceDescription: string;
  sourceReference: string | null;
  cadence: string;
  accountableOwnerId: string;
  retiredAt: string | null;
  supersedesMeasureVersionId: string | null;
  policyVersion: typeof OUTCOME_POLICY_VERSION;
  evaluatorVersion: typeof OUTCOME_EVALUATOR_VERSION;
  createdByUserId: string;
  createdAt: string;
}

export interface OutcomeObservation {
  id: string;
  measureVersionId: string;
  organisationId: string;
  workspaceId: string;
  value: OutcomeValue;
  effectiveAt: string;
  recordedAt: string;
  sourceDescription: string;
  sourceReference: string | null;
  actorUserId: string;
  idempotencyKey: string;
  payloadHash: string;
  supersedesObservationId: string | null;
  correctionReason: string | null;
  traceId: string;
}

export type OutcomeTiming = "on_time" | "late" | "not_applicable";

export interface OutcomeProjection {
  status: OutcomeStatus;
  reasonCode: OutcomeReasonCode;
  policyVersion: typeof OUTCOME_POLICY_VERSION;
  evaluatorVersion: typeof OUTCOME_EVALUATOR_VERSION;
  decisiveObservationId: string | null;
  decisiveEffectiveAt: string | null;
  decisiveRecordedAt: string | null;
  satisfactionTiming: OutcomeTiming;
  deadlineWasMissed: boolean;
  recordedLate: boolean;
  customerCopy: string;
}

export interface OutcomeStatusEvent extends OutcomeProjection {
  id: string;
  measureVersionId: string;
  organisationId: string;
  workspaceId: string;
  sequence: number;
  triggerObservationId: string | null;
  facts: Record<string, unknown>;
  traceId: string;
  occurredAt: string;
}

export interface OutcomeMeasureRecord {
  measure: OutcomeMeasureVersion;
  observations: OutcomeObservation[];
  current: OutcomeProjection;
  history: OutcomeStatusEvent[];
}
