import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { describe, expect, it, vi } from "vitest";

import {
  recommendationAnalyticsContracts,
  recommendationAnalyticsEventTypes,
  RecommendationAnalyticsError,
  validateRecommendationAnalyticsEvent,
  type RecommendationAnalyticsEventType,
} from "@/lib/recommendation-analytics/model";
import {
  RecommendationAnalyticsService,
  type RecommendationAnalyticsRepository,
} from "@/lib/recommendation-analytics/service.server";
import type {
  RecommendationAnalyticsConsent,
  RecommendationAnalyticsEvent,
} from "@/lib/recommendation-analytics/types";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  actorUserId: "44444444-4444-4444-8444-444444444444",
};
const granted: RecommendationAnalyticsConsent = {
  id: "55555555-5555-4555-8555-555555555555",
  organisationId: tenant.organisationId,
  userId: tenant.actorUserId,
  status: "granted",
  version: 1,
  occurredAt: "2026-08-03T13:00:00.000Z",
};

const eventContracts: Record<
  RecommendationAnalyticsEventType,
  { objectType: string; properties: Record<string, string> }
> = {
  portfolio_viewed: { objectType: "portfolio", properties: {} },
  explanation_opened: { objectType: "portfolio_item", properties: {} },
  decision_recorded: {
    objectType: "decision",
    properties: { decision_state: "accepted" },
  },
  action_started: { objectType: "action", properties: { action_state: "in_progress" } },
  action_blocked: { objectType: "action", properties: { action_state: "blocked" } },
  action_completed: { objectType: "action", properties: { action_state: "completed" } },
  outcome_observed: { objectType: "outcome", properties: {} },
  knowledge_pack_handoff: {
    objectType: "handoff",
    properties: { handoff_state: "consumed" },
  },
  teammate_handoff: { objectType: "handoff", properties: { handoff_state: "consumed" } },
  usefulness_submitted: {
    objectType: "portfolio_item",
    properties: { usefulness: "helpful" },
  },
};

function input(eventType: RecommendationAnalyticsEventType = "portfolio_viewed") {
  return {
    eventId: `analytics-${eventType}`,
    eventType,
    objectType: eventContracts[eventType].objectType,
    objectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    objectVersion: "1.0.0",
    mode: "workspace",
    properties: eventContracts[eventType].properties,
    occurredAt: "2026-08-03T13:05:00.000Z",
    ...tenant,
  };
}

function captured(eventType: RecommendationAnalyticsEventType): RecommendationAnalyticsEvent {
  const source = input(eventType);
  return {
    eventId: source.eventId,
    organisationId: source.organisationId,
    workspaceId: source.workspaceId,
    actorPseudonym: "a".repeat(64),
    eventType,
    objectType: source.objectType as RecommendationAnalyticsEvent["objectType"],
    objectId: source.objectId,
    objectVersion: source.objectVersion,
    mode: "workspace",
    properties: source.properties,
    occurredAt: source.occurredAt,
    schemaVersion: "deliveryiq.recommendation-analytics/1.0.0",
  };
}

function harness(
  options: {
    consent?: RecommendationAnalyticsConsent | null;
    sourceExists?: boolean;
    captureError?: Error;
  } = {},
) {
  const events = new Map<string, RecommendationAnalyticsEvent>();
  const repository: RecommendationAnalyticsRepository = {
    getConsent: vi.fn(async () => (options.consent === undefined ? granted : options.consent)),
    setConsent: vi.fn(async (value) => ({
      ...granted,
      status: value.status,
      version: value.status === "granted" ? 1 : 2,
    })),
    sourceExists: vi.fn(async () => options.sourceExists ?? true),
    capture: vi.fn(async (value) => {
      if (options.captureError) throw options.captureError;
      const existing = events.get(String(value.eventId));
      if (existing) return existing;
      const created = captured(value.eventType as RecommendationAnalyticsEventType);
      events.set(created.eventId, created);
      return created;
    }),
    aggregate: vi.fn(async () => []),
  };
  return {
    repository,
    service: new RecommendationAnalyticsService(repository, async () => "a".repeat(64)),
  };
}

describe("S4-013 privacy-safe recommendation analytics", () => {
  it.each(recommendationAnalyticsEventTypes)("accepts the exact %s allow-list contract", (type) => {
    expect(validateRecommendationAnalyticsEvent(input(type))).toMatchObject({
      eventType: type,
      ...eventContracts[type],
    });
  });

  it("rejects raw answers, notes, evidence, free text and unknown properties", () => {
    for (const property of ["raw_answer", "note", "evidence", "free_text", "secret"]) {
      expect(() =>
        validateRecommendationAnalyticsEvent({
          ...input(),
          properties: { [property]: "prohibited customer content" },
        }),
      ).toThrowError(
        expect.objectContaining<Partial<RecommendationAnalyticsError>>({
          code: "RECOMMENDATION_ANALYTICS_PROPERTY_DENIED",
        }),
      );
    }
    expect(
      Object.values(recommendationAnalyticsContracts).flatMap((item) =>
        Object.keys(item.properties),
      ),
    ).not.toContain("text");
  });

  it("records consented events with a tenant-scoped pseudonym and deduplicates event IDs", async () => {
    const { service, repository } = harness();
    const first = await service.capture(input());
    const replay = await service.capture(input());
    expect(first.recorded).toBe(true);
    expect(replay.event?.eventId).toBe(first.event?.eventId);
    expect(repository.capture).toHaveBeenCalledTimes(2);
    expect(repository.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        actorPseudonym: "a".repeat(64),
        schemaVersion: "deliveryiq.recommendation-analytics/1.0.0",
        requestHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(JSON.stringify(first)).not.toContain(tenant.actorUserId);
  });

  it("stops collection immediately when consent is absent or withdrawn", async () => {
    for (const consent of [null, { ...granted, status: "withdrawn" as const, version: 2 }]) {
      const { service, repository } = harness({ consent });
      await expect(service.capture(input())).resolves.toEqual({
        recorded: false,
        reason: "consent_required",
      });
      expect(repository.sourceExists).not.toHaveBeenCalled();
      expect(repository.capture).not.toHaveBeenCalled();
    }
  });

  it("fails closed when the object is outside the current tenant", async () => {
    const { service } = harness({ sourceExists: false });
    await expect(service.capture(input())).rejects.toEqual(
      expect.objectContaining({ code: "RECOMMENDATION_ACCESS_DENIED", status: 404 }),
    );
  });

  it("never lets analytics failure break the originating workflow", async () => {
    const { service } = harness({ captureError: new Error("vendor unavailable") });
    await expect(service.captureSafely(input("decision_recorded"))).resolves.toEqual({
      recorded: false,
    });
  });

  it("enforces the ten-tenant product-reporting threshold", async () => {
    const { repository } = harness();
    repository.aggregate = vi.fn(async () => [
      {
        eventType: "portfolio_viewed",
        mode: "workspace",
        properties: {},
        tenantCount: 9,
        eventCount: 100,
      },
    ]);
    const service = new RecommendationAnalyticsService(repository, async () => "a".repeat(64));
    await expect(
      service.aggregate("2026-08-01T00:00:00.000Z", "2026-08-31T00:00:00.000Z"),
    ).rejects.toEqual(
      expect.objectContaining({ code: "RECOMMENDATION_ANALYTICS_PRIVACY_THRESHOLD" }),
    );
    repository.aggregate = vi.fn(async () => [
      {
        eventType: "portfolio_viewed",
        mode: "workspace",
        properties: {},
        tenantCount: 10,
        eventCount: 100,
      },
    ]);
    await expect(
      new RecommendationAnalyticsService(repository, async () => "a".repeat(64)).aggregate(
        "2026-08-01T00:00:00.000Z",
        "2026-08-31T00:00:00.000Z",
      ),
    ).resolves.toMatchObject({ minimumTenantCohort: 10 });
  });

  it("validates 10,000 allow-listed events inside the one-second ingestion budget", () => {
    const started = performance.now();
    for (let index = 0; index < 10_000; index += 1) {
      validateRecommendationAnalyticsEvent({ ...input(), eventId: `analytics-${index}` });
    }
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it("uses deny-by-default storage, governed retention and aggregate privacy in SQL", () => {
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20260803130000_recommendation_analytics.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const hardening = readFileSync(
      new URL(
        "../supabase/migrations/20260803131000_harden_recommendation_analytics_permissions.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain("HAVING count(DISTINCT event.organisation_id) >= 10");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("RECOMMENDATION_ANALYTICS_CONSENT_REQUIRED");
    expect(migration).toContain("recommendation-analytics-event:");
    expect(migration).toContain("recommendation-analytics-consent:");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("apply_recommendation_analytics_retention");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(hardening).toContain("GRANT SELECT");
    expect(migration).not.toMatch(
      /INSERT INTO public\.recommendation_(catalogue|definitions|activations)/,
    );
    expect(migration).not.toContain("raw_answer");
  });

  it("ships explicit consent UX and server-authoritative workflow signals without rule writes", () => {
    const experience = readFileSync(
      new URL("../src/components/dashboard/recommendation-portfolio-section.tsx", import.meta.url),
      "utf8",
    );
    const decision = readFileSync(
      new URL("../src/lib/recommendation-decisions/http.server.ts", import.meta.url),
      "utf8",
    );
    const action = readFileSync(
      new URL("../src/lib/recommendation-actions/http.server.ts", import.meta.url),
      "utf8",
    );
    const handoff = readFileSync(
      new URL("../src/lib/recommendation-handoffs/http.server.ts", import.meta.url),
      "utf8",
    );
    const analyticsHttp = readFileSync(
      new URL("../src/lib/recommendation-analytics/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(experience).toContain("Share usage signals");
    expect(experience).toContain("Stop sharing usage signals");
    expect(experience).toContain("Raw answers, notes");
    expect(decision).toContain('eventType: "decision_recorded"');
    expect(action).toContain('"action_completed"');
    expect(handoff).toContain('"knowledge_pack_handoff"');
    expect(analyticsHttp).toContain("assessmentRequestContext(request, { write: true })");
    for (const source of [decision, action, handoff]) {
      expect(source).toContain("captureRecommendationAnalyticsSafely");
      expect(source).not.toContain("transition_recommendation_catalogue");
      expect(source).not.toContain("recommendation_rules");
    }
  });

  it("accepts outcome analytics only through the governed tenant-owned S4-010 source", () => {
    const repository = readFileSync(
      new URL("../src/lib/recommendation-analytics/repository.server.ts", import.meta.url),
      "utf8",
    );
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20260803152000_enable_governed_outcome_analytics.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const outcomeHttp = readFileSync(
      new URL("../src/lib/recommendation-outcomes/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(repository).toContain('outcome: "recommendation_action_outcomes"');
    expect(migration).toContain(
      "WHEN 'outcome' THEN SELECT EXISTS (SELECT 1 FROM public.recommendation_action_outcomes",
    );
    expect(migration).toContain("organisation_id = v_organisation_id");
    expect(migration).toContain("workspace_id = v_workspace_id");
    expect(outcomeHttp).toContain('eventType: "outcome_observed"');
    expect(outcomeHttp).toContain("captureRecommendationAnalyticsSafely");
  });
});
