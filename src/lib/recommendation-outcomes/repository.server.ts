/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  OutcomeMeasureVersion,
  OutcomeObservation,
  OutcomeProjection,
  OutcomeStatusEvent,
  RecommendationActionOutcome,
} from "./types";

const database = supabaseAdmin as unknown as {
  from(table: string): any;
  rpc(name: string, parameters: Record<string, unknown>): Promise<any>;
};

function outcome(row: Record<string, any>): RecommendationActionOutcome {
  return {
    id: row.id,
    actionId: row.action_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    portfolioItemId: row.portfolio_item_id,
    recommendationDefinitionId: row.recommendation_definition_id,
    recommendationId: row.recommendation_id,
    recommendationVersion: row.recommendation_version,
    catalogueVersionId: row.catalogue_version_id,
    catalogueVersion: row.catalogue_version,
    catalogueDigest: row.catalogue_digest,
    intendedOutcome: row.intended_outcome,
    successMeasureTemplates: row.success_measure_templates ?? [],
    policyVersion: row.policy_version,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

function value(row: Record<string, any>, prefix: "baseline" | "target") {
  if (row[`${prefix}_numeric`] !== null && row[`${prefix}_numeric`] !== undefined) {
    return { kind: "numeric" as const, value: String(row[`${prefix}_numeric`]) };
  }
  if (row[`${prefix}_binary`] !== null && row[`${prefix}_binary`] !== undefined) {
    return { kind: "binary" as const, value: Boolean(row[`${prefix}_binary`]) };
  }
  return null;
}

function measure(row: Record<string, any>): OutcomeMeasureVersion {
  return {
    id: row.id,
    outcomeId: row.outcome_id,
    measureId: row.measure_id,
    version: row.measure_version,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    actionId: row.action_id,
    sourceRecommendationId: row.source_recommendation_id,
    sourceRecommendationVersion: row.source_recommendation_version,
    sourceCatalogueVersionId: row.source_catalogue_version_id,
    sourceCatalogueVersion: row.source_catalogue_version,
    sourceCatalogueDigest: row.source_catalogue_digest,
    direction: row.direction,
    unit: row.unit,
    decimalScale: row.decimal_scale,
    baselineValue: value(row, "baseline"),
    baselineEffectiveAt: row.baseline_effective_at,
    targetValue: value(row, "target"),
    tolerance: row.absolute_tolerance === null ? null : String(row.absolute_tolerance),
    targetDate: row.target_date,
    targetTimezone: row.target_timezone,
    targetDeadlineAt: row.target_deadline_at,
    sourceDescription: row.source_description,
    sourceReference: row.source_reference,
    cadence: row.cadence,
    accountableOwnerId: row.accountable_owner_id,
    retiredAt: row.retired_at,
    supersedesMeasureVersionId: row.supersedes_measure_version_id,
    policyVersion: row.policy_version,
    evaluatorVersion: row.evaluator_version,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

function observation(row: Record<string, any>): OutcomeObservation {
  return {
    id: row.id,
    measureVersionId: row.measure_version_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    value:
      row.numeric_value !== null
        ? { kind: "numeric", value: String(row.numeric_value) }
        : { kind: "binary", value: Boolean(row.binary_value) },
    effectiveAt: row.effective_at,
    recordedAt: row.recorded_at,
    sourceDescription: row.source_description,
    sourceReference: row.source_reference,
    actorUserId: row.actor_user_id,
    idempotencyKey: row.idempotency_key,
    payloadHash: row.payload_hash,
    supersedesObservationId: row.supersedes_observation_id,
    correctionReason: row.correction_reason,
    traceId: row.trace_id,
  };
}

function statusEvent(row: Record<string, any>): OutcomeStatusEvent {
  return {
    id: row.id,
    measureVersionId: row.measure_version_id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id,
    sequence: row.sequence,
    status: row.status,
    reasonCode: row.reason_code,
    policyVersion: row.policy_version,
    evaluatorVersion: row.evaluator_version,
    decisiveObservationId: row.decisive_observation_id,
    decisiveEffectiveAt: row.decisive_effective_at,
    decisiveRecordedAt: row.decisive_recorded_at,
    satisfactionTiming: row.timing,
    deadlineWasMissed: row.deadline_was_missed,
    recordedLate: row.recorded_late,
    customerCopy: row.customer_copy,
    triggerObservationId: row.trigger_observation_id,
    facts: row.facts ?? {},
    traceId: row.trace_id,
    occurredAt: row.occurred_at,
  };
}

export async function getOutcomeByAction(
  actionId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_action_outcomes")
    .select("*")
    .eq("action_id", actionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? outcome(result.data) : null;
}

export async function createOutcome(input: Record<string, unknown>) {
  const result = await database.rpc("create_recommendation_action_outcome", { p_input: input });
  if (result.error) throw new Error(result.error.message);
  return outcome(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function listMeasureVersions(
  outcomeId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_outcome_measure_versions")
    .select("*")
    .eq("outcome_id", outcomeId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("measure_version", { ascending: false })
    .limit(1001);
  if (result.error) throw new Error(result.error.message);
  if ((result.data?.length ?? 0) > 1000) throw new Error("OUTCOME_EXPORT_LIMIT");
  return (result.data ?? []).map(measure);
}

export async function listMeasurementCandidates(limit = 500) {
  const result = await database
    .from("recommendation_outcome_measure_versions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 4, 1), 2000));
  if (result.error) throw new Error(result.error.message);
  const current = new Map<string, OutcomeMeasureVersion>();
  for (const row of result.data ?? []) {
    const mapped = measure(row);
    if (!current.has(mapped.measureId)) current.set(mapped.measureId, mapped);
  }
  return [...current.values()].slice(0, limit);
}

export async function getMeasureVersion(
  measureVersionId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_outcome_measure_versions")
    .select("*")
    .eq("id", measureVersionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? measure(result.data) : null;
}

export async function listObservations(
  measureVersionId: string,
  tenant: { organisationId: string; workspaceId: string },
  options: { limit?: number; beforeRecordedAt?: string } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 250);
  let query = database
    .from("recommendation_outcome_observations")
    .select("*")
    .eq("measure_version_id", measureVersionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit + 1);
  if (options.beforeRecordedAt) query = query.lt("recorded_at", options.beforeRecordedAt);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return {
    items: (result.data ?? []).slice(0, limit).map(observation),
    nextCursor: (result.data?.length ?? 0) > limit ? result.data[limit - 1].recorded_at : null,
  };
}

export async function listAllObservations(
  measureVersionId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_outcome_observations")
    .select("*")
    .eq("measure_version_id", measureVersionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("effective_at", { ascending: true })
    .limit(10_001);
  if (result.error) throw new Error(result.error.message);
  if ((result.data?.length ?? 0) > 10_000) throw new Error("OUTCOME_EXPORT_LIMIT");
  return (result.data ?? []).map(observation);
}

export async function listStatusEvents(
  measureVersionId: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_outcome_status_events")
    .select("*")
    .eq("measure_version_id", measureVersionId)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .order("sequence", { ascending: true })
    .limit(10_001);
  if (result.error) throw new Error(result.error.message);
  if ((result.data?.length ?? 0) > 10_000) throw new Error("OUTCOME_EXPORT_LIMIT");
  return (result.data ?? []).map(statusEvent);
}

export async function getObservationByIdempotency(
  idempotencyKey: string,
  tenant: { organisationId: string; workspaceId: string },
) {
  const result = await database
    .from("recommendation_outcome_observations")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("organisation_id", tenant.organisationId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? observation(result.data) : null;
}

export async function createMeasureVersion(input: Record<string, unknown>) {
  const result = await database.rpc("create_recommendation_outcome_measure_version", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  return measure(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function recordObservation(input: Record<string, unknown>) {
  const result = await database.rpc("record_recommendation_outcome_observation", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  return observation(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function appendStatusEvent(input: Record<string, unknown>) {
  const result = await database.rpc("append_recommendation_outcome_status_event", {
    p_input: input,
  });
  if (result.error) throw new Error(result.error.message);
  return statusEvent(Array.isArray(result.data) ? result.data[0] : result.data);
}

export function eventProjection(event: OutcomeStatusEvent): OutcomeProjection {
  return {
    status: event.status,
    reasonCode: event.reasonCode,
    policyVersion: event.policyVersion,
    evaluatorVersion: event.evaluatorVersion,
    decisiveObservationId: event.decisiveObservationId,
    decisiveEffectiveAt: event.decisiveEffectiveAt,
    decisiveRecordedAt: event.decisiveRecordedAt,
    satisfactionTiming: event.satisfactionTiming,
    deadlineWasMissed: event.deadlineWasMissed,
    recordedLate: event.recordedLate,
    customerCopy: event.customerCopy,
  };
}
