import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { describe, expect, it, vi } from "vitest";

import { permissionsFor } from "@/lib/identity/rbac";
import { semanticHash } from "@/lib/recommendation-evaluation/evaluator";
import {
  canonicalDecimal,
  evaluateOutcomeMeasure,
  outcomeDeadline,
  OutcomeMeasurementError,
} from "@/lib/recommendation-outcomes/model";
import {
  OUTCOME_ASSOCIATION_COPY,
  projectRecommendationOutcome,
} from "@/lib/recommendation-outcomes/projection";
import {
  RecommendationOutcomeService,
  type RecommendationOutcomeRepository,
} from "@/lib/recommendation-outcomes/service.server";
import {
  OUTCOME_EVALUATOR_VERSION,
  OUTCOME_POLICY_VERSION,
  type OutcomeMeasureVersion,
  type OutcomeObservation,
  type OutcomeProjection,
  type RecommendationActionOutcome,
} from "@/lib/recommendation-outcomes/types";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};
const actor = "88888888-8888-4888-8888-888888888888";
const deadline = "2026-01-31T23:59:59.999Z";

function measure(overrides: Partial<OutcomeMeasureVersion> = {}): OutcomeMeasureVersion {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    outcomeId: "44444444-4444-4444-8444-444444444444",
    measureId: "55555555-5555-4555-8555-555555555555",
    version: 1,
    ...tenant,
    actionId: "66666666-6666-4666-8666-666666666666",
    sourceRecommendationId: "rec_decision_rights",
    sourceRecommendationVersion: "1.0.0",
    sourceCatalogueVersionId: "77777777-7777-4777-8777-777777777777",
    sourceCatalogueVersion: "1.0.0",
    sourceCatalogueDigest: "a".repeat(64),
    direction: "increase",
    unit: "percentage points",
    decimalScale: 2,
    baselineValue: { kind: "numeric", value: "5.00" },
    baselineEffectiveAt: "2026-01-01T00:00:00.000Z",
    targetValue: { kind: "numeric", value: "10.00" },
    tolerance: null,
    targetDate: "2026-01-31",
    targetTimezone: "UTC",
    targetDeadlineAt: deadline,
    sourceDescription: "Monthly operating report",
    sourceReference: "report://delivery/2026-01",
    cadence: "Monthly",
    accountableOwnerId: actor,
    retiredAt: null,
    supersedesMeasureVersionId: null,
    policyVersion: OUTCOME_POLICY_VERSION,
    evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
    createdByUserId: actor,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

let observationSequence = 0;
function observation(
  value: string | boolean,
  overrides: Partial<OutcomeObservation> = {},
): OutcomeObservation {
  observationSequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(observationSequence).padStart(12, "0")}`,
    measureVersionId: measure().id,
    ...tenant,
    value: typeof value === "boolean" ? { kind: "binary", value } : { kind: "numeric", value },
    effectiveAt: "2026-01-20T12:00:00.000Z",
    recordedAt: "2026-01-20T12:01:00.000Z",
    sourceDescription: "Customer-provided evidence",
    sourceReference: null,
    actorUserId: actor,
    idempotencyKey: `outcome-fixture-${String(observationSequence).padStart(16, "0")}`,
    payloadHash: "b".repeat(64),
    supersedesObservationId: null,
    correctionReason: null,
    traceId: `trace-outcome-${observationSequence}`,
    ...overrides,
  };
}

function expectProjection(
  fixtureId: string,
  current: OutcomeProjection,
  expected: Partial<OutcomeProjection>,
) {
  expect(current, fixtureId).toMatchObject({
    policyVersion: "PDR-004-001/1.0",
    evaluatorVersion: "deliveryiq.outcome-measurement/1.0.0",
    deadlineWasMissed: false,
    recordedLate: false,
    satisfactionTiming: "on_time",
    ...expected,
  });
}

describe("PDR-004-001 mandatory outcome golden fixtures", () => {
  it.each([
    ["out_inc_equal", "increase", "10.00", "target_met", "target_satisfied"],
    ["out_inc_below", "increase", "9.99", "tracking", "target_pending"],
    ["out_inc_above", "increase", "10.01", "target_met", "target_satisfied"],
    ["out_dec_equal", "decrease", "10.00", "target_met", "target_satisfied"],
    ["out_dec_above", "decrease", "10.01", "tracking", "target_pending"],
    ["out_dec_below", "decrease", "9.99", "target_met", "target_satisfied"],
  ] as const)(
    "%s uses inclusive increase/decrease boundaries",
    (id, direction, observed, status, reasonCode) => {
      const item = observation(observed);
      expectProjection(
        id,
        evaluateOutcomeMeasure(measure({ direction }), [item], "2026-01-21T00:00:00.000Z"),
        { status, reasonCode, decisiveObservationId: item.id },
      );
    },
  );

  it.each([
    ["out_maintain_lower_equal", "8.00", "2.00", "target_met"],
    ["out_maintain_upper_equal", "12.00", "2.00", "target_met"],
    ["out_maintain_below", "7.99", "2.00", "tracking"],
    ["out_maintain_above", "12.01", "2.00", "tracking"],
    ["out_maintain_zero_tolerance_equal", "10.00", "0.00", "target_met"],
    ["out_maintain_zero_tolerance_diff", "10.01", "0.00", "tracking"],
  ] as const)("%s applies the inclusive absolute tolerance", (id, observed, tolerance, status) => {
    const item = observation(observed);
    expectProjection(
      id,
      evaluateOutcomeMeasure(
        measure({ direction: "maintain", tolerance }),
        [item],
        "2026-01-21T00:00:00.000Z",
      ),
      {
        status,
        reasonCode: status === "target_met" ? "target_satisfied" : "target_pending",
        decisiveObservationId: item.id,
      },
    );
    if (status === "tracking") {
      expect(
        evaluateOutcomeMeasure(
          measure({ direction: "maintain", tolerance }),
          [item],
          "2026-01-21T00:00:00.000Z",
        ).customerCopy,
      ).toBe("The latest observation is outside the agreed range.");
    }
  });

  it.each([
    ["out_binary_match", true, true, "target_met", "target_satisfied"],
    ["out_binary_miss", false, true, "tracking", "target_pending"],
  ] as const)("%s uses exact binary equality", (id, observed, target, status, reasonCode) => {
    const item = observation(observed);
    expectProjection(
      id,
      evaluateOutcomeMeasure(
        measure({
          direction: "binary",
          unit: "binary",
          decimalScale: 0,
          baselineValue: null,
          baselineEffectiveAt: null,
          targetValue: { kind: "binary", value: target },
        }),
        [item],
        "2026-01-21T00:00:00.000Z",
      ),
      { status, reasonCode, decisiveObservationId: item.id },
    );
    if (status === "target_met") {
      expect(
        evaluateOutcomeMeasure(
          measure({
            direction: "binary",
            unit: "binary",
            decimalScale: 0,
            baselineValue: null,
            baselineEffectiveAt: null,
            targetValue: { kind: "binary", value: target },
          }),
          [item],
          "2026-01-21T00:00:00.000Z",
        ).customerCopy,
      ).toBe("The latest recorded observation meets the target.");
    }
  });

  it("out_numeric_missing_baseline fails closed", () => {
    expectProjection(
      "out_numeric_missing_baseline",
      evaluateOutcomeMeasure(measure({ baselineValue: null }), [], "2026-01-20T00:00:00.000Z"),
      {
        status: "not_measured",
        reasonCode: "baseline_missing",
        satisfactionTiming: "not_applicable",
      },
    );
  });

  it("out_baseline_no_observation remains baseline recorded", () => {
    expectProjection(
      "out_baseline_no_observation",
      evaluateOutcomeMeasure(measure(), [], "2026-01-20T00:00:00.000Z"),
      {
        status: "baseline_recorded",
        reasonCode: "baseline_only",
        satisfactionTiming: "not_applicable",
      },
    );
  });

  it("out_before_deadline_miss remains tracking", () => {
    const item = observation("9.00");
    expectProjection(
      "out_before_deadline_miss",
      evaluateOutcomeMeasure(measure(), [item], "2026-01-30T00:00:00.000Z"),
      { status: "tracking", reasonCode: "target_pending", decisiveObservationId: item.id },
    );
  });

  it("out_deadline_no_observation records the missed deadline", () => {
    expectProjection(
      "out_deadline_no_observation",
      evaluateOutcomeMeasure(measure(), [], "2026-02-01T00:00:00.000Z"),
      {
        status: "target_not_met",
        reasonCode: "no_observation_by_target_date",
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      },
    );
  });

  it("out_deadline_boundary_met includes the final millisecond", () => {
    const item = observation("10.00", { effectiveAt: deadline, recordedAt: deadline });
    expectProjection(
      "out_deadline_boundary_met",
      evaluateOutcomeMeasure(measure(), [item], "2026-02-01T00:00:00.000Z"),
      { status: "target_met", reasonCode: "target_satisfied", decisiveObservationId: item.id },
    );
  });

  it("out_late_miss remains target not met", () => {
    const item = observation("9.00", {
      effectiveAt: "2026-02-02T00:00:00.000Z",
      recordedAt: "2026-02-02T00:01:00.000Z",
    });
    expectProjection(
      "out_late_miss",
      evaluateOutcomeMeasure(measure(), [item], "2026-02-02T01:00:00.000Z"),
      {
        status: "target_not_met",
        reasonCode: "target_not_met_by_date",
        decisiveObservationId: item.id,
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      },
    );
  });

  it("out_late_met restores target met while preserving timing", () => {
    const item = observation("10.00", {
      effectiveAt: "2026-02-02T00:00:00.000Z",
      recordedAt: "2026-02-02T00:01:00.000Z",
    });
    expectProjection(
      "out_late_met",
      evaluateOutcomeMeasure(measure(), [item], "2026-02-02T01:00:00.000Z"),
      {
        status: "target_met",
        reasonCode: "target_satisfied_late",
        decisiveObservationId: item.id,
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      },
    );
  });

  it("out_late_restore lets later effective evidence restore target met", () => {
    const missed = observation("9.00", { effectiveAt: "2026-02-01T00:00:00.000Z" });
    const restored = observation("11.00", {
      effectiveAt: "2026-02-02T00:00:00.000Z",
      recordedAt: "2026-02-02T01:00:00.000Z",
    });
    expectProjection(
      "out_late_restore",
      evaluateOutcomeMeasure(measure(), [missed, restored], "2026-02-03T00:00:00.000Z"),
      {
        status: "target_met",
        reasonCode: "target_satisfied_late",
        decisiveObservationId: restored.id,
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      },
    );
  });

  it("out_post_met_regression returns the current state to target not met", () => {
    const met = observation("11.00", { effectiveAt: "2026-01-20T00:00:00.000Z" });
    const regressed = observation("8.00", {
      effectiveAt: "2026-02-02T00:00:00.000Z",
      recordedAt: "2026-02-02T01:00:00.000Z",
    });
    expectProjection(
      "out_post_met_regression",
      evaluateOutcomeMeasure(measure(), [met, regressed], "2026-02-03T00:00:00.000Z"),
      {
        status: "target_not_met",
        reasonCode: "target_not_met_by_date",
        decisiveObservationId: regressed.id,
        satisfactionTiming: "late",
        deadlineWasMissed: true,
      },
    );
  });

  it("out_recorded_late_effective_on_time separates effective and recorded timing", () => {
    const item = observation("10.00", {
      effectiveAt: "2026-01-31T20:00:00.000Z",
      recordedAt: "2026-02-02T10:00:00.000Z",
    });
    expectProjection(
      "out_recorded_late_effective_on_time",
      evaluateOutcomeMeasure(measure(), [item], "2026-02-02T10:01:00.000Z"),
      {
        status: "target_met",
        reasonCode: "target_satisfied",
        decisiveObservationId: item.id,
        recordedLate: true,
      },
    );
  });

  it("out_supersede_fail_with_pass uses the terminal correction", () => {
    const failed = observation("9.00");
    const passed = observation("10.00", {
      supersedesObservationId: failed.id,
      correctionReason: "Verified source correction",
      effectiveAt: failed.effectiveAt,
      recordedAt: "2026-01-21T00:00:00.000Z",
    });
    expectProjection(
      "out_supersede_fail_with_pass",
      evaluateOutcomeMeasure(measure(), [failed, passed], "2026-01-22T00:00:00.000Z"),
      { status: "target_met", reasonCode: "target_satisfied", decisiveObservationId: passed.id },
    );
  });

  it("out_supersede_pass_with_fail uses the terminal correction", () => {
    const passed = observation("10.00");
    const failed = observation("9.00", {
      supersedesObservationId: passed.id,
      correctionReason: "Verified source correction",
      effectiveAt: passed.effectiveAt,
      recordedAt: "2026-01-21T00:00:00.000Z",
    });
    expectProjection(
      "out_supersede_pass_with_fail",
      evaluateOutcomeMeasure(measure(), [passed, failed], "2026-01-22T00:00:00.000Z"),
      { status: "tracking", reasonCode: "target_pending", decisiveObservationId: failed.id },
    );
  });

  it("out_supersede_chain uses only the terminal leaf", () => {
    const first = observation("8.00");
    const second = observation("9.00", {
      supersedesObservationId: first.id,
      correctionReason: "First correction",
    });
    const third = observation("10.00", {
      supersedesObservationId: second.id,
      correctionReason: "Final verified correction",
    });
    expectProjection(
      "out_supersede_chain",
      evaluateOutcomeMeasure(measure(), [first, second, third], "2026-01-22T00:00:00.000Z"),
      { status: "target_met", reasonCode: "target_satisfied", decisiveObservationId: third.id },
    );
  });

  it("out_supersede_cycle fails closed", () => {
    const first = observation("8.00");
    const second = observation("9.00", {
      supersedesObservationId: first.id,
      correctionReason: "Correction",
    });
    first.supersedesObservationId = second.id;
    first.correctionReason = "Invalid cycle";
    expect(() =>
      evaluateOutcomeMeasure(measure(), [first, second], "2026-01-22T00:00:00.000Z"),
    ).toThrowError(OutcomeMeasurementError);
  });

  it("out_supersede_branch fails closed", () => {
    const first = observation("8.00");
    const second = observation("9.00", {
      supersedesObservationId: first.id,
      correctionReason: "A",
    });
    const third = observation("10.00", {
      supersedesObservationId: first.id,
      correctionReason: "B",
    });
    expect(() =>
      evaluateOutcomeMeasure(measure(), [first, second, third], "2026-01-22T00:00:00.000Z"),
    ).toThrow("branches");
  });

  it("out_decimal_no_display_round compares canonical decimals", () => {
    const item = observation("0.0995");
    expect(canonicalDecimal("0.1000", 4)).toBe("0.1000");
    expectProjection(
      "out_decimal_no_display_round",
      evaluateOutcomeMeasure(
        measure({
          decimalScale: 4,
          baselineValue: { kind: "numeric", value: "0.0000" },
          targetValue: { kind: "numeric", value: "0.1000" },
        }),
        [item],
        "2026-01-22T00:00:00.000Z",
      ),
      { status: "tracking", reasonCode: "target_pending", decisiveObservationId: item.id },
    );
  });

  it("out_equal_effective_order uses ascending stable ID as the final tie-breaker", () => {
    const same = {
      effectiveAt: "2026-01-20T00:00:00.000Z",
      recordedAt: "2026-01-21T00:00:00.000Z",
    };
    const winner = observation("10.00", { id: "00000000-0000-4000-8000-000000000001", ...same });
    const other = observation("9.00", { id: "00000000-0000-4000-8000-000000000002", ...same });
    expectProjection(
      "out_equal_effective_order",
      evaluateOutcomeMeasure(measure(), [other, winner], "2026-01-22T00:00:00.000Z"),
      { status: "target_met", reasonCode: "target_satisfied", decisiveObservationId: winner.id },
    );
  });

  it("out_retired has absolute precedence", () => {
    const item = observation("10.00");
    expectProjection(
      "out_retired",
      evaluateOutcomeMeasure(
        measure({ retiredAt: "2026-01-21T00:00:00.000Z" }),
        [item],
        "2026-01-22T00:00:00.000Z",
      ),
      {
        status: "retired",
        reasonCode: "measure_retired",
        satisfactionTiming: "not_applicable",
        decisiveObservationId: null,
      },
    );
  });

  it("out_association_copy never makes a causal claim", () => {
    expect(OUTCOME_ASSOCIATION_COPY).toContain("associated");
    expect(OUTCOME_ASSOCIATION_COPY).toContain("does not prove");
    const projected = projectRecommendationOutcome(
      outcome(),
      [
        {
          measure: measure(),
          observations: [],
          current: evaluateOutcomeMeasure(measure(), [], "2026-01-20T00:00:00.000Z"),
          history: [],
        },
      ],
      "executive",
    );
    expect(projected.associationNotice).toBe(OUTCOME_ASSOCIATION_COPY);
  });
});

function outcome(): RecommendationActionOutcome {
  return {
    id: measure().outcomeId,
    actionId: measure().actionId,
    ...tenant,
    portfolioItemId: "99999999-9999-4999-8999-999999999999",
    recommendationDefinitionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    recommendationId: "rec_decision_rights",
    recommendationVersion: "1.0.0",
    catalogueVersionId: measure().sourceCatalogueVersionId,
    catalogueVersion: "1.0.0",
    catalogueDigest: "a".repeat(64),
    intendedOutcome: "Faster, clearer decisions",
    successMeasureTemplates: ["Decision turnaround time"],
    policyVersion: OUTCOME_POLICY_VERSION,
    createdByUserId: actor,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function repository(
  overrides: Partial<RecommendationOutcomeRepository> = {},
): RecommendationOutcomeRepository {
  return {
    getOutcomeByAction: vi.fn().mockResolvedValue(outcome()),
    createOutcome: vi.fn().mockResolvedValue(outcome()),
    listMeasureVersions: vi.fn().mockResolvedValue([measure()]),
    listMeasurementCandidates: vi.fn().mockResolvedValue([measure()]),
    getMeasureVersion: vi.fn().mockResolvedValue(measure()),
    listAllObservations: vi.fn().mockResolvedValue([]),
    listObservations: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    listStatusEvents: vi.fn().mockResolvedValue([]),
    getObservationByIdempotency: vi.fn().mockResolvedValue(null),
    createMeasureVersion: vi.fn().mockResolvedValue(measure()),
    recordObservation: vi.fn().mockImplementation(async (input) => ({
      ...observation(String(input.value)),
      id: String(input.observation_id),
      payloadHash: String(input.payload_hash),
      idempotencyKey: String(input.idempotency_key),
    })),
    appendStatusEvent: vi.fn().mockImplementation(async (input) => ({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      measureVersionId: measure().id,
      ...tenant,
      sequence: 1,
      ...(input.projection as OutcomeProjection),
      triggerObservationId: null,
      facts: input.facts as Record<string, unknown>,
      traceId: String(input.trace_id),
      occurredAt: "2026-01-21T00:00:00.000Z",
    })),
    ...overrides,
  };
}

describe("PDR-004-001 service, isolation and persistence controls", () => {
  it("out_idempotent_replay reuses the immutable observation", async () => {
    const request = {
      measureVersionId: measure().id,
      ...tenant,
      actorUserId: actor,
      value: { kind: "numeric" as const, value: "10.00" },
      effectiveAt: "2026-01-20T12:00:00.000Z",
      sourceDescription: "Verified source",
      sourceReference: null,
      idempotencyKey: "outcome-idempotent-replay-0001",
    };
    const payloadHash = await semanticHash({
      measureVersionId: request.measureVersionId,
      ...tenant,
      actorUserId: actor,
      value: request.value,
      effectiveAt: request.effectiveAt,
      sourceDescription: request.sourceDescription,
      sourceReference: null,
      supersedesObservationId: null,
      correctionReason: null,
    });
    const existing = observation("10.00", {
      measureVersionId: request.measureVersionId,
      idempotencyKey: request.idempotencyKey,
      payloadHash,
    });
    const repo = repository({ getObservationByIdempotency: vi.fn().mockResolvedValue(existing) });
    const service = new RecommendationOutcomeService(
      repo,
      () => "2026-01-21T00:00:00.000Z",
      () => "fixed-id",
    );
    await service.observe(request);
    expect(repo.recordObservation).not.toHaveBeenCalled();
  });

  it("out_conflicting_replay rejects reuse with a different payload", async () => {
    const repo = repository({
      getObservationByIdempotency: vi
        .fn()
        .mockResolvedValue(observation("9.00", { payloadHash: "f".repeat(64) })),
    });
    const service = new RecommendationOutcomeService(repo);
    await expect(
      service.observe({
        measureVersionId: measure().id,
        ...tenant,
        actorUserId: actor,
        value: { kind: "numeric", value: "10.00" },
        effectiveAt: "2026-01-20T00:00:00.000Z",
        sourceDescription: "Verified source",
        sourceReference: null,
        idempotencyKey: "outcome-conflicting-replay-0001",
      }),
    ).rejects.toMatchObject({ code: "OUTCOME_IDEMPOTENCY_CONFLICT", status: 409 });
  });

  it("out_cross_tenant fails without revealing the measure", async () => {
    const repo = repository({ getMeasureVersion: vi.fn().mockResolvedValue(null) });
    const service = new RecommendationOutcomeService(repo);
    await expect(
      service.observe({
        measureVersionId: measure().id,
        organisationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        workspaceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        actorUserId: actor,
        value: { kind: "numeric", value: "10.00" },
        effectiveAt: "2026-01-20T00:00:00.000Z",
        sourceDescription: "Verified source",
        sourceReference: null,
        idempotencyKey: "outcome-cross-tenant-000001",
      }),
    ).rejects.toMatchObject({ code: "OUTCOME_ACCESS_DENIED", status: 404 });
  });

  it("out_unauthorised_actor is denied outcome write permission", () => {
    expect(permissionsFor(["workspace_member"]).includes("workspace:manage")).toBe(false);
    expect(permissionsFor(["workspace_manager"]).includes("workspace:manage")).toBe(true);
  });

  it("retries a stale concurrent projection and records exactly once", async () => {
    const record = vi
      .fn()
      .mockRejectedValueOnce(new Error("OUTCOME_PROJECTION_STALE"))
      .mockResolvedValueOnce(observation("10.00"));
    const repo = repository({ recordObservation: record });
    const service = new RecommendationOutcomeService(
      repo,
      () => "2026-01-21T00:00:00.000Z",
      () => "00000000-0000-4000-8000-000000000099",
    );
    await service.observe({
      measureVersionId: measure().id,
      ...tenant,
      actorUserId: actor,
      value: { kind: "numeric", value: "10.00" },
      effectiveAt: "2026-01-20T00:00:00.000Z",
      sourceDescription: "Verified source",
      sourceReference: null,
      idempotencyKey: "outcome-concurrent-observe-001",
    });
    expect(record).toHaveBeenCalledTimes(2);
  });

  it("evaluates a large bounded observation history within the API budget", () => {
    const items = Array.from({ length: 10_000 }, (_, index) =>
      observation(index % 2 ? "9.00" : "10.00", {
        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        effectiveAt: new Date(Date.UTC(2026, 0, 2) + index * 1_000).toISOString(),
        recordedAt: new Date(Date.UTC(2026, 0, 2) + index * 1_000 + 500).toISOString(),
      }),
    );
    const started = performance.now();
    const result = evaluateOutcomeMeasure(
      measure({ targetDeadlineAt: null, targetDate: null, targetTimezone: null }),
      items,
      "2026-02-01T00:00:00.000Z",
    );
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(result.decisiveObservationId).toBe(items.at(-1)?.id);
  });

  it("computes a DST-safe final instant for the snapshotted timezone", () => {
    expect(outcomeDeadline("2026-03-29", "Europe/London")).toBe("2026-03-29T22:59:59.999Z");
  });

  it("ships immutable, deny-by-default and hardened persistence", () => {
    const migration = readFileSync(
      "supabase/migrations/20260803150000_recommendation_outcome_measurement.sql",
      "utf8",
    );
    const hardening = readFileSync(
      "supabase/migrations/20260803151000_harden_recommendation_outcome_permissions.sql",
      "utf8",
    );
    expect(migration.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(4);
    expect(migration.match(/reject_audit_mutation/g)).toHaveLength(4);
    expect(migration).toContain("UNIQUE (supersedes_observation_id)");
    expect(migration).toContain("OUTCOME_PROJECTION_STALE");
    expect(migration).toContain("CREATE TRIGGER recommendation_action_outcome_capture");
    expect(migration).toContain("ON CONFLICT (action_id) DO NOTHING");
    expect(migration).not.toMatch(/CREATE POLICY/);
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(hardening).toContain("REVOKE MAINTAIN");
  });

  it("ships accessible customer controls and a server-side write boundary", () => {
    const component = readFileSync(
      new URL("../src/components/dashboard/recommendation-outcome-controls.tsx", import.meta.url),
      "utf8",
    );
    const http = readFileSync(
      new URL("../src/lib/recommendation-outcomes/http.server.ts", import.meta.url),
      "utf8",
    );
    expect(component).toContain("<fieldset");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('role="alert"');
    expect(component).toContain("min-h-11");
    expect(component).toContain("does not prove");
    expect(http).toContain('assertPermission(verified.identity, "workspace:manage")');
    expect(http).toContain("assessmentRequestContext(request, { write: true })");
  });
});
