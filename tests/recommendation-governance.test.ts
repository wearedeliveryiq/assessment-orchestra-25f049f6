import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { describe, expect, it, vi } from "vitest";

import {
  buildRecommendationAuditExport,
  configurationDiff,
  recommendationOperationalAlertCodes,
  RecommendationGovernanceError,
} from "@/lib/recommendation-governance/model";
import {
  RecommendationGovernanceService,
  type RecommendationGovernanceRepository,
} from "@/lib/recommendation-governance/service.server";
import type {
  RecommendationAuditExportJob,
  RecommendationAuditSource,
} from "@/lib/recommendation-governance/types";

const scope = {
  organisation_id: "22222222-2222-4222-8222-222222222222",
  workspace_id: "33333333-3333-4333-8333-333333333333",
};

function source(): RecommendationAuditSource {
  const version = {
    ...scope,
    id: "root-version",
    analysis_run_id: "analysis-1",
    configuration_set_id: "sprint03-product-config-1.0.0",
    catalogue_version_id: "catalogue-version-1",
    catalogue_id: "deliveryiq-recommendations",
    catalogue_version: "1.0.0",
    catalogue_digest: "c".repeat(64),
    policy_version: "1.0.0",
    input_hash: "a".repeat(64),
    output_hash: "b".repeat(64),
    created_at: "2026-08-03T14:00:00.000Z",
  };
  return {
    portfolio: {
      ...version,
      id: "portfolio-1",
      recommendation_evaluation_id: "evaluation-1",
      confidence_gate_id: "confidence-1",
      conflict_resolution_id: "resolution-1",
      priority_model_id: "priority-1",
      sequence_model_id: "sequence-1",
      portfolio_state: "complete",
      item_count: 1,
      scheduled_count: 1,
      projector_version: "1.0.0",
    },
    portfolioItems: [
      {
        ...scope,
        id: "portfolio-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        portfolio_order: 1,
        primary_class: "immediate_attention",
        priority_label: "high",
        source_trace_node_ids: ["trace-1"],
        semantic_hash: "d".repeat(64),
      },
    ],
    catalogueVersion: {
      id: "catalogue-version-1",
      catalogue_id: "deliveryiq-recommendations",
      version: "1.0.0",
      source_configuration_set_id: "sprint03-product-config-1.0.0",
      content_digest: "c".repeat(64),
      current_state: "active",
      snapshot: { restricted: "not-exported" },
    },
    catalogueDefinitions: [
      {
        id: "definition-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        catalogue_order: 1,
        intent_digest: "e".repeat(64),
        definition: { internalRule: "not-exported" },
      },
    ],
    catalogueApprovals: [
      {
        id: "approval-1",
        catalogue_version_id: "catalogue-version-1",
        approved_by: "private-approver",
        approved_at: "2026-08-03T14:01:00.000Z",
      },
    ],
    catalogueLifecycle: [
      {
        id: 1,
        catalogue_version_id: "catalogue-version-1",
        event_type: "activate",
        from_state: "approved",
        to_state: "active",
        actor_id: "private-actor",
        payload: { private: true },
      },
    ],
    evaluation: { ...version, id: "evaluation-1", evaluator_version: "1.0.0" },
    evaluationCandidates: [
      {
        ...scope,
        id: "candidate-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        result: "eligible",
        source_trace_node_ids: ["private-trace"],
        decisive_facts: ["private-fact"],
        semantic_hash: "f".repeat(64),
      },
    ],
    confidenceGate: { ...version, id: "confidence-1", confidence_state: "high" },
    confidenceCandidates: [
      {
        ...scope,
        id: "confidence-candidate-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        post_gate_result: "presented",
        reason_code: "confidence_high",
        confidence_state: "high",
        semantic_hash: "1".repeat(64),
      },
    ],
    resolution: { ...version, id: "resolution-1", resolver_version: "1.0.0" },
    resolutionCandidates: [
      {
        ...scope,
        id: "resolution-candidate-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        resolution_result: "canonical",
        reason_code: "retained",
        semantic_hash: "2".repeat(64),
      },
    ],
    priorityModel: { ...version, id: "priority-1", priority_engine_version: "1.0.0" },
    priorityItems: [
      {
        ...scope,
        id: "priority-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        generated_rank: 1,
        priority_label: "high",
        impact: "high",
        effort: "medium",
        semantic_hash: "3".repeat(64),
      },
    ],
    sequenceModel: { ...version, id: "sequence-1", sequencer_version: "1.0.0" },
    sequenceItems: [
      {
        ...scope,
        id: "sequence-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        generated_sequence: 1,
        generated_horizon: "day30",
        sequence_state: "scheduled",
        reason_code: "rank_and_horizon_fit",
        semantic_hash: "4".repeat(64),
      },
    ],
    sequenceDependencies: [],
    decisionEvents: [
      {
        ...scope,
        id: "decision-event-1",
        portfolio_item_id: "portfolio-item-1",
        decision_version: 1,
        command: "accepted",
        previous_state: "undecided",
        current_state: "accepted",
        actor_user_id: "private-actor",
        payload_hash: "5".repeat(64),
      },
    ],
    decisions: [
      {
        ...scope,
        id: "decision-1",
        portfolio_item_id: "portfolio-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        current_state: "accepted",
        decision_version: 1,
        last_actor_user_id: "private-actor",
      },
    ],
    plans: [{ ...scope, id: "plan-1", portfolio_id: "portfolio-1", plan_version: 1 }],
    actionEvents: [
      {
        ...scope,
        id: "action-event-1",
        action_id: "action-1",
        portfolio_item_id: "portfolio-item-1",
        action_version: 1,
        command: "created",
        current_state: "not_started",
        note: "private free text",
        actor_user_id: "private-actor",
      },
    ],
    actions: [
      {
        ...scope,
        id: "action-1",
        plan_id: "plan-1",
        portfolio_item_id: "portfolio-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        source_decision_id: "decision-1",
        source_decision_version: 1,
        status: "completed",
        action_version: 2,
        note: "private note",
        completion_note: "private completion",
        accountable_owner_id: "private-owner",
        contributor_ids: ["private-contributor"],
        evidence_references: ["private-evidence"],
      },
    ],
    handoffs: [
      {
        ...scope,
        id: "handoff-1",
        source_action_id: "action-1",
        source_portfolio_item_id: "portfolio-item-1",
        recommendation_id: "rec_decision_rights",
        recommendation_version: "1.0.0",
        target_type: "knowledge_pack",
        target_id: "delivery-dna",
        target_version: "1.0.0",
        cta: "view_pack",
        consent_basis: "explicit_handoff_request",
        token_hash: "private-token",
        created_by_user_id: "private-actor",
      },
    ],
    handoffEvents: [
      {
        ...scope,
        id: 1,
        handoff_id: "handoff-1",
        event_type: "consumed",
        actor_user_id: "private-actor",
      },
    ],
  };
}

function queued(
  overrides: Partial<RecommendationAuditExportJob> = {},
): RecommendationAuditExportJob {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organisationId: scope.organisation_id,
    workspaceId: scope.workspace_id,
    portfolioId: "portfolio-1",
    requestedBy: "44444444-4444-4444-8444-444444444444",
    status: "queued",
    attempt: 0,
    retryable: true,
    failureCode: null,
    leaseOwner: null,
    createdAt: "2026-08-03T14:00:00.000Z",
    startedAt: null,
    completedAt: null,
    availableUntil: null,
    payloadHash: null,
    payload: null,
    ...overrides,
  };
}

function harness(
  options: { enabled?: boolean; auditSource?: RecommendationAuditSource | null } = {},
) {
  const repository: RecommendationGovernanceRepository = {
    requestExport: vi.fn(async () => queued()),
    getExport: vi.fn(async () => queued()),
    claimExports: vi.fn(async () => []),
    completeExport: vi.fn(async (id, _lease, payload, hash) =>
      queued({ id, status: "completed", retryable: false, payload, payloadHash: hash }),
    ),
    failExport: vi.fn(async (id, _lease, failureCode) =>
      queued({ id, status: "failed", failureCode }),
    ),
    retryExport: vi.fn(async () => queued()),
    recordExportAccess: vi.fn(async () => undefined),
    loadAuditSource: vi.fn(async () =>
      options.auditSource === undefined ? source() : options.auditSource,
    ),
    featureEnabled: vi.fn(async () => options.enabled ?? true),
    setFeatureFlag: vi.fn(async (input) => input),
    getCatalogueVersionForDiff: vi.fn(async () => null),
    operationalHealth: vi.fn(async () => ({
      generatedAt: "2026-08-03T14:00:00.000Z",
      status: "healthy",
      metrics: {
        queuedExports: 0,
        processingExports: 0,
        failedExports: 0,
        oldestQueuedSeconds: 0,
        criticalIntegrityFailures: 0,
        openCriticalAlerts: 0,
      },
      alertCoverage: [...recommendationOperationalAlertCodes],
    })),
  };
  return { repository, service: new RecommendationGovernanceService(repository) };
}

describe("S4-014 recommendation governance, audit and operations", () => {
  it("builds a complete versioned audit export and redacts restricted fields", () => {
    const exported = buildRecommendationAuditExport(source(), "2026-08-03T15:00:00.000Z");
    expect(exported.integrity).toMatchObject({ status: "passed" });
    expect(exported.catalogue.version).toMatchObject({ version: "1.0.0" });
    expect(exported.customerOverlay).toMatchObject({ outcomes: [] });
    expect(exported.limitations[0]).toContain("S4-010");
    const encoded = JSON.stringify(exported);
    for (const prohibited of [
      "private-actor",
      "private-owner",
      "private-contributor",
      "private-evidence",
      "private note",
      "private completion",
      "private-token",
      "private-trace",
      "private-fact",
      "internalRule",
    ]) {
      expect(encoded).not.toContain(prohibited);
    }
  });

  it("fails closed for cross-tenant or orphan lineage", () => {
    const escaped = source();
    escaped.actions[0].organisation_id = "other-tenant";
    expect(() => buildRecommendationAuditExport(escaped)).toThrowError(
      expect.objectContaining<Partial<RecommendationGovernanceError>>({
        code: "RECOMMENDATION_ACCESS_DENIED",
      }),
    );
    const orphaned = source();
    orphaned.portfolioItems[0].source_trace_node_ids = [];
    expect(() => buildRecommendationAuditExport(orphaned)).toThrowError(
      expect.objectContaining<Partial<RecommendationGovernanceError>>({
        code: "RECOMMENDATION_AUDIT_INTEGRITY_FAILED",
      }),
    );
  });

  it("produces a categorical configuration diff without tenant data", () => {
    const diff = configurationDiff(
      {
        id: "from",
        version: "1.0.0",
        contentDigest: "a".repeat(64),
        snapshot: { definitions: [{ id: "rec_one", effort: "low" }] },
      },
      {
        id: "to",
        version: "1.1.0",
        contentDigest: "b".repeat(64),
        snapshot: {
          definitions: [
            { id: "rec_one", effort: "medium" },
            { id: "rec_two", effort: "low" },
          ],
        },
      },
    );
    expect(diff.changes).toEqual([
      { recommendationId: "rec_one", change: "modified", changedFields: ["effort"] },
      { recommendationId: "rec_two", change: "added" },
    ]);
    expect(JSON.stringify(diff)).not.toContain(scope.organisation_id);
  });

  it("keeps audit export disabled when the governed flag is absent", async () => {
    const { service, repository } = harness({ enabled: false });
    await expect(
      service.requestExport({
        portfolioId: "portfolio-1",
        organisationId: scope.organisation_id,
        workspaceId: scope.workspace_id,
        requestedBy: "actor-1",
        idempotencyKey: "audit-export-request-0001",
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "RECOMMENDATION_FEATURE_DISABLED" }));
    expect(repository.requestExport).not.toHaveBeenCalled();
  });

  it("validates lineage before publishing an idempotent asynchronous job", async () => {
    const { service, repository } = harness();
    const request = {
      portfolioId: "portfolio-1",
      organisationId: scope.organisation_id,
      workspaceId: scope.workspace_id,
      requestedBy: "actor-1",
      idempotencyKey: "audit-export-request-0001",
    };
    await expect(service.requestExport(request)).resolves.toMatchObject({ status: "queued" });
    await expect(service.requestExport(request)).resolves.toMatchObject({ status: "queued" });
    expect(repository.requestExport).toHaveBeenCalledTimes(2);
    expect(repository.requestExport).toHaveBeenLastCalledWith(
      expect.objectContaining({ requestHash: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    );
  });

  it("contains partial worker failure and supports governed retry without source mutation", async () => {
    const { service, repository } = harness();
    repository.claimExports = vi.fn(async () => [
      queued({ status: "processing", attempt: 1, leaseOwner: "lease-1" }),
      queued({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: "processing",
        attempt: 1,
        leaseOwner: "lease-2",
      }),
    ]);
    repository.loadAuditSource = vi
      .fn()
      .mockResolvedValueOnce(source())
      .mockResolvedValueOnce(null);
    await expect(service.processExports()).resolves.toEqual({
      claimed: 2,
      results: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "completed" },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "failed" },
      ],
    });
    expect(repository.completeExport).toHaveBeenCalledTimes(1);
    expect(repository.failExport).toHaveBeenCalledWith(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "lease-2",
      "RECOMMENDATION_AUDIT_INTEGRITY_FAILED",
    );
  });

  it("denies an expired export and records every authorised access", async () => {
    const { service, repository } = harness();
    repository.getExport = vi.fn(async () =>
      queued({
        status: "completed",
        retryable: false,
        payload: buildRecommendationAuditExport(source()),
        payloadHash: "a".repeat(64),
        availableUntil: "2000-01-01T00:00:00.000Z",
      }),
    );
    await expect(
      service.getExport(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        { organisationId: scope.organisation_id, workspaceId: scope.workspace_id },
        "actor-1",
        true,
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "RECOMMENDATION_AUDIT_EXPORT_EXPIRED" }));
    expect(repository.recordExportAccess).toHaveBeenCalledWith({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      organisationId: scope.organisation_id,
      workspaceId: scope.workspace_id,
      actorUserId: "actor-1",
      mode: "download",
    });
  });

  it("projects 10,000 bounded audit events well inside the 60-second export target", () => {
    const input = source();
    input.catalogueLifecycle = [];
    input.actionEvents = [];
    input.handoffEvents = [];
    input.decisionEvents = Array.from({ length: 10_000 }, (_, index) => ({
      ...scope,
      id: `decision-event-${index}`,
      portfolio_item_id: "portfolio-item-1",
      decision_version: index + 1,
      command: "accepted",
      previous_state: "undecided",
      current_state: "accepted",
      occurred_at: "2026-08-03T14:00:00.000Z",
    }));
    const started = performance.now();
    expect(buildRecommendationAuditExport(input).customerOverlay.decisionEvents).toHaveLength(
      10_000,
    );
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("rejects audit exports above the locked 10,000-event bound", () => {
    const input = source();
    input.catalogueLifecycle = [];
    input.actionEvents = [];
    input.handoffEvents = [];
    input.decisionEvents = Array.from({ length: 10_001 }, (_, index) => ({
      ...scope,
      id: `decision-event-${index}`,
      portfolio_item_id: "portfolio-item-1",
      decision_version: index + 1,
      command: "accepted",
      previous_state: "undecided",
      current_state: "accepted",
      occurred_at: "2026-08-03T14:00:00.000Z",
    }));
    expect(() => buildRecommendationAuditExport(input)).toThrowError(
      expect.objectContaining({ code: "RECOMMENDATION_AUDIT_EXPORT_LIMIT_EXCEEDED" }),
    );
  });

  it("covers every locked operational alert and deny-by-default migration control", () => {
    expect(recommendationOperationalAlertCodes).toEqual([
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
    ]);
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20260803140000_recommendation_governance_operations.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const hardening = readFileSync(
      new URL(
        "../supabase/migrations/20260803141000_harden_recommendation_governance_permissions.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain("coalesce((");
    expect(migration).toContain("), false)");
    expect(migration).toContain("interval '15 minutes'");
    expect(migration).toContain("LIMIT p_limit FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).not.toContain("CREATE POLICY");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(hardening).toContain("REVOKE MAINTAIN");
    expect(migration).not.toMatch(/UPDATE public\.recommendation_(catalogue|definitions)/);
  });

  it("ships elevated auth, access logging, safe support replay and scheduled processing", () => {
    const http = readFileSync(
      new URL("../src/lib/recommendation-governance/http.server.ts", import.meta.url),
      "utf8",
    );
    const service = readFileSync(
      new URL("../src/lib/recommendation-governance/service.server.ts", import.meta.url),
      "utf8",
    );
    const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
    expect(http).toContain("assertTenantAudit");
    expect(http).toContain('assertPermission(identity, "recommendation:govern")');
    expect(service).toContain("recordExportAccess");
    expect(service).toContain("retryExport");
    expect(vite).toContain('"recommendation-governance:exports"');
    expect(vite).toContain('"* * * * *"');
  });
});
