import type {
  RecommendationAuditExport,
  RecommendationAuditSource,
  RecommendationIntegrityStatus,
} from "./types";

export const recommendationAuditExportVersion =
  "deliveryiq.recommendation-audit-export/1.0.0" as const;

export const recommendationOperationalAlertCodes = [
  "promotion_failure",
  "invalid_catalogue",
  "orphan_lineage",
  "dependency_cycle",
  "transition_conflict",
  "command_failure",
  "export_failure",
  "tenant_denial",
  "handoff_abuse",
  "latency",
] as const;

export const recommendationGovernanceFeatureKeys = ["audit_exports"] as const;

export class RecommendationGovernanceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const has = (row: Record<string, unknown>, key: string) => row[key] !== undefined;

function pick(row: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => has(row, key)).map((key) => [key, row[key]]));
}

function scoped(rows: Record<string, unknown>[], organisationId: string, workspaceId: string) {
  return rows.every(
    (row) =>
      (!has(row, "organisation_id") || row.organisation_id === organisationId) &&
      (!has(row, "workspace_id") || row.workspace_id === workspaceId),
  );
}

function actorRedacted(rows: Record<string, unknown>[], keys: readonly string[]) {
  return rows.map((row) => pick(row, keys));
}

const VERSION_FIELDS = [
  "id",
  "analysis_run_id",
  "configuration_set_id",
  "catalogue_version_id",
  "catalogue_id",
  "catalogue_version",
  "catalogue_digest",
  "policy_version",
  "input_hash",
  "output_hash",
  "created_at",
] as const;

export function buildRecommendationAuditExport(
  source: RecommendationAuditSource,
  generatedAt = new Date().toISOString(),
): RecommendationAuditExport {
  const organisationId = String(source.portfolio.organisation_id ?? "");
  const workspaceId = String(source.portfolio.workspace_id ?? "");
  const portfolioId = String(source.portfolio.id ?? "");
  if (!organisationId || !workspaceId || !portfolioId) {
    throw new RecommendationGovernanceError(
      "RECOMMENDATION_AUDIT_INTEGRITY_FAILED",
      422,
      "The recommendation audit source is incomplete.",
    );
  }
  const tenantRows = [
    source.portfolio,
    ...source.portfolioItems,
    source.evaluation,
    ...source.evaluationCandidates,
    source.confidenceGate,
    ...source.confidenceCandidates,
    source.resolution,
    ...source.resolutionCandidates,
    source.priorityModel,
    ...source.priorityItems,
    source.sequenceModel,
    ...source.sequenceItems,
    ...source.sequenceDependencies,
    ...source.decisionEvents,
    ...source.decisions,
    ...source.plans,
    ...source.actionEvents,
    ...source.actions,
    ...source.actionOutcomes,
    ...source.outcomeMeasureVersions,
    ...source.outcomeObservations,
    ...source.outcomeStatusEvents,
    ...source.handoffs,
    ...source.handoffEvents,
  ];
  if (!scoped(tenantRows, organisationId, workspaceId)) {
    throw new RecommendationGovernanceError(
      "RECOMMENDATION_ACCESS_DENIED",
      404,
      "The recommendation audit source is not available.",
    );
  }
  const itemIds = new Set(source.portfolioItems.map((row) => String(row.id)));
  const traceComplete = source.portfolioItems.every(
    (row) => Array.isArray(row.source_trace_node_ids) && row.source_trace_node_ids.length > 0,
  );
  const overlayLinked = [...source.decisions, ...source.actions, ...source.handoffs].every((row) =>
    itemIds.has(String(row.portfolio_item_id ?? row.source_portfolio_item_id)),
  );
  const actionIds = new Set(source.actions.map((row) => String(row.id)));
  const outcomeIds = new Set(source.actionOutcomes.map((row) => String(row.id)));
  const measureVersionIds = new Set(source.outcomeMeasureVersions.map((row) => String(row.id)));
  const outcomeLineage =
    source.actionOutcomes.every((row) => actionIds.has(String(row.action_id))) &&
    source.outcomeMeasureVersions.every((row) => outcomeIds.has(String(row.outcome_id))) &&
    [...source.outcomeObservations, ...source.outcomeStatusEvents].every((row) =>
      measureVersionIds.has(String(row.measure_version_id)),
    );
  const everyActionHasOutcome = source.actions.every((row) =>
    source.actionOutcomes.some((outcome) => outcome.action_id === row.id),
  );
  const countsReconcile =
    Number(source.portfolio.item_count ?? source.portfolioItems.length) ===
    source.portfolioItems.length;
  const checks = {
    tenantScope: true,
    portfolioCount: countsReconcile,
    traceCoverage: traceComplete,
    customerOverlayLinkage: overlayLinked,
    outcomeSourceAvailable: outcomeLineage && everyActionHasOutcome,
  };
  const status: RecommendationIntegrityStatus = Object.values(checks).every((value) => value)
    ? "passed"
    : "failed";
  if (status === "failed") {
    throw new RecommendationGovernanceError(
      "RECOMMENDATION_AUDIT_INTEGRITY_FAILED",
      422,
      "Recommendation lineage failed integrity validation.",
    );
  }
  const auditEventCount =
    source.catalogueLifecycle.length +
    source.decisionEvents.length +
    source.actionEvents.length +
    source.outcomeStatusEvents.length +
    source.handoffEvents.length;
  if (auditEventCount > 10_000) {
    throw new RecommendationGovernanceError(
      "RECOMMENDATION_AUDIT_EXPORT_LIMIT_EXCEEDED",
      422,
      "The recommendation audit export exceeds the supported event limit.",
    );
  }

  return {
    schemaVersion: recommendationAuditExportVersion,
    generatedAt,
    scope: { organisationId, workspaceId, portfolioId },
    catalogue: {
      version: pick(source.catalogueVersion, [
        "id",
        "catalogue_id",
        "version",
        "source_configuration_set_id",
        "content_digest",
        "current_state",
        "created_at",
        "updated_at",
      ]),
      definitions: actorRedacted(source.catalogueDefinitions, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "catalogue_order",
        "intent_digest",
        "created_at",
      ]),
      approvals: actorRedacted(source.catalogueApprovals, [
        "id",
        "catalogue_version_id",
        "approved_at",
      ]),
      lifecycle: actorRedacted(source.catalogueLifecycle, [
        "id",
        "catalogue_version_id",
        "event_type",
        "from_state",
        "to_state",
        "created_at",
      ]),
    },
    intelligence: {
      evaluation: pick(source.evaluation, [...VERSION_FIELDS, "evaluator_version"]),
      candidates: actorRedacted(source.evaluationCandidates, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "catalogue_order",
        "result",
        "confidence_state",
        "semantic_hash",
        "created_at",
      ]),
      confidence: pick(source.confidenceGate, [
        ...VERSION_FIELDS,
        "confidence_version",
        "gate_engine_version",
        "confidence_state",
      ]),
      confidenceCandidates: actorRedacted(source.confidenceCandidates, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "post_gate_result",
        "reason_code",
        "confidence_state",
        "semantic_hash",
        "created_at",
      ]),
      resolution: pick(source.resolution, [...VERSION_FIELDS, "resolver_version"]),
      resolutionCandidates: actorRedacted(source.resolutionCandidates, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "resolution_result",
        "reason_code",
        "semantic_hash",
        "created_at",
      ]),
      priority: pick(source.priorityModel, [...VERSION_FIELDS, "priority_engine_version"]),
      priorityItems: actorRedacted(source.priorityItems, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "generated_rank",
        "priority_label",
        "impact",
        "effort",
        "semantic_hash",
        "created_at",
      ]),
      sequence: pick(source.sequenceModel, [...VERSION_FIELDS, "sequencer_version"]),
      sequenceItems: actorRedacted(source.sequenceItems, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "generated_sequence",
        "generated_horizon",
        "sequence_state",
        "reason_code",
        "semantic_hash",
        "created_at",
      ]),
      dependencies: actorRedacted(source.sequenceDependencies, [
        "id",
        "dependant_recommendation_id",
        "source_dependency_id",
        "resolved_dependency_id",
        "dependency_type",
        "dependency_state",
        "resolution",
        "reason_code",
        "semantic_hash",
        "created_at",
      ]),
    },
    portfolio: {
      version: pick(source.portfolio, [
        ...VERSION_FIELDS,
        "id",
        "portfolio_state",
        "item_count",
        "scheduled_count",
        "policy_version",
        "projector_version",
      ]),
      items: actorRedacted(source.portfolioItems, [
        "id",
        "recommendation_id",
        "recommendation_version",
        "portfolio_order",
        "primary_class",
        "priority_label",
        "impact",
        "effort",
        "confidence_state",
        "confidence_result",
        "generated_sequence",
        "generated_horizon",
        "sequence_state",
        "semantic_hash",
        "created_at",
      ]),
    },
    customerOverlay: {
      decisions: actorRedacted(source.decisions, [
        "id",
        "portfolio_item_id",
        "recommendation_id",
        "recommendation_version",
        "current_state",
        "decision_version",
        "reason_category",
        "review_at",
        "acknowledged",
        "updated_at",
      ]),
      decisionEvents: actorRedacted(source.decisionEvents, [
        "id",
        "portfolio_item_id",
        "decision_version",
        "command",
        "previous_state",
        "current_state",
        "reason_category",
        "review_at",
        "acknowledged",
        "occurred_at",
      ]),
      plans: actorRedacted(source.plans, ["id", "portfolio_id", "plan_version", "created_at"]),
      actions: source.actions.map((row) => ({
        ...pick(row, [
          "id",
          "plan_id",
          "portfolio_item_id",
          "recommendation_id",
          "recommendation_version",
          "source_decision_id",
          "source_decision_version",
          "status",
          "action_version",
          "target_date",
          "created_at",
          "updated_at",
          "started_at",
          "completed_at",
          "cancelled_at",
        ]),
        contributorCount: Array.isArray(row.contributor_ids) ? row.contributor_ids.length : 0,
        evidenceReferenceCount: Array.isArray(row.evidence_references)
          ? row.evidence_references.length
          : 0,
        completionEvidenceRecorded:
          (Array.isArray(row.evidence_references) && row.evidence_references.length > 0) ||
          typeof row.evidence_not_available_reason === "string",
      })),
      actionEvents: actorRedacted(source.actionEvents, [
        "id",
        "action_id",
        "portfolio_item_id",
        "action_version",
        "command",
        "previous_state",
        "current_state",
        "target_date",
        "dependency_override",
        "occurred_at",
      ]),
      outcomes: source.actionOutcomes.map((row) => ({
        ...pick(row, [
          "id",
          "action_id",
          "portfolio_item_id",
          "recommendation_id",
          "recommendation_version",
          "catalogue_version_id",
          "catalogue_version",
          "catalogue_digest",
          "intended_outcome",
          "success_measure_templates",
          "policy_version",
          "created_at",
        ]),
        measureVersions: source.outcomeMeasureVersions
          .filter((measure) => measure.outcome_id === row.id)
          .map((measure) => ({
            ...pick(measure, [
              "id",
              "measure_id",
              "measure_version",
              "direction",
              "unit",
              "decimal_scale",
              "baseline_numeric",
              "baseline_binary",
              "baseline_effective_at",
              "target_numeric",
              "target_binary",
              "absolute_tolerance",
              "target_date",
              "target_timezone",
              "target_deadline_at",
              "source_description",
              "cadence",
              "retired_at",
              "policy_version",
              "evaluator_version",
              "created_at",
            ]),
            observations: actorRedacted(
              source.outcomeObservations.filter(
                (observation) => observation.measure_version_id === measure.id,
              ),
              [
                "id",
                "measure_version_id",
                "numeric_value",
                "binary_value",
                "effective_at",
                "recorded_at",
                "source_description",
                "supersedes_observation_id",
                "correction_reason",
                "trace_id",
              ],
            ),
            statusHistory: actorRedacted(
              source.outcomeStatusEvents.filter((event) => event.measure_version_id === measure.id),
              [
                "id",
                "measure_version_id",
                "sequence",
                "status",
                "reason_code",
                "decisive_observation_id",
                "decisive_effective_at",
                "decisive_recorded_at",
                "timing",
                "deadline_was_missed",
                "recorded_late",
                "customer_copy",
                "policy_version",
                "evaluator_version",
                "trace_id",
                "occurred_at",
              ],
            ),
          })),
      })),
      handoffs: actorRedacted(source.handoffs, [
        "id",
        "source_action_id",
        "source_portfolio_item_id",
        "recommendation_id",
        "recommendation_version",
        "target_type",
        "target_id",
        "target_version",
        "cta",
        "consent_basis",
        "consented_at",
        "expires_at",
        "created_at",
      ]),
      handoffEvents: actorRedacted(source.handoffEvents, [
        "id",
        "handoff_id",
        "event_type",
        "occurred_at",
      ]),
    },
    integrity: { status, checks },
    limitations: ["The export records association and lineage; it does not claim causation."],
  };
}

export function configurationDiff(
  from: { id: string; version: string; contentDigest: string; snapshot: Record<string, unknown> },
  to: { id: string; version: string; contentDigest: string; snapshot: Record<string, unknown> },
) {
  const definitions = (value: Record<string, unknown>) =>
    new Map(
      (Array.isArray(value.definitions) ? value.definitions : []).map((entry) => {
        const row = entry as Record<string, unknown>;
        return [String(row.id), row];
      }),
    );
  const left = definitions(from.snapshot);
  const right = definitions(to.snapshot);
  const ids = [...new Set([...left.keys(), ...right.keys()])].sort();
  const changes: Array<{
    recommendationId: string;
    change: "added" | "removed" | "modified";
    changedFields?: string[];
  }> = [];
  for (const id of ids) {
    const before = left.get(id);
    const after = right.get(id);
    if (!before) {
      changes.push({ recommendationId: id, change: "added" });
      continue;
    }
    if (!after) {
      changes.push({ recommendationId: id, change: "removed" });
      continue;
    }
    const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .sort();
    if (changedFields.length) {
      changes.push({ recommendationId: id, change: "modified", changedFields });
    }
  }
  return {
    from: { id: from.id, version: from.version, contentDigest: from.contentDigest },
    to: { id: to.id, version: to.version, contentDigest: to.contentDigest },
    identical: from.contentDigest === to.contentDigest,
    changes,
  };
}
