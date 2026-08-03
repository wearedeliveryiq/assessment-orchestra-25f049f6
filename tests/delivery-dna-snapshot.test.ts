import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  deliveryDnaSnapshotConfiguration,
  deliveryDnaSnapshotQuestions,
  evaluateDeliveryDnaSnapshot,
  normaliseSnapshotResponse,
  safeSnapshotAnalyticsEvent,
  snapshotContinuationRecord,
  type SnapshotResponse,
} from "../src/lib/delivery-dna/snapshot";
import { deliveryDnaCatalogue } from "../src/lib/delivery-dna/catalogue";

const migration = readFileSync(
  "supabase/migrations/20260803210000_delivery_dna_snapshot.sql",
  "utf8",
);
const hardening = readFileSync(
  "supabase/migrations/20260803211000_harden_delivery_dna_snapshot_permissions.sql",
  "utf8",
);
const linkValueFix = readFileSync(
  "supabase/migrations/20260803212000_fix_delivery_dna_snapshot_link_value.sql",
  "utf8",
);
const route = readFileSync("src/routes/snapshot.tsx", "utf8");
const apiRoute = readFileSync("src/routes/api/delivery-dna-snapshot.ts", "utf8");
const client = readFileSync("src/lib/delivery-dna/snapshot-client.ts", "utf8");
const server = readFileSync("src/lib/delivery-dna/snapshot.server.ts", "utf8");

type Fixture = {
  id: string;
  input: {
    answersByCapabilityOrder?: Array<number | null>;
    statusesByCapabilityOrder?: string[];
    notApplicableReasonsPresent?: boolean;
    snapshotQuestionId?: string;
    status?: string;
    answer?: number;
    respondedAt?: string;
    linkingConsent?: boolean;
  };
  expected: Record<string, unknown>;
};

function responsesFor(fixture: Fixture): SnapshotResponse[] {
  const answers = fixture.input.answersByCapabilityOrder ?? [];
  const statuses = fixture.input.statusesByCapabilityOrder ?? [];
  return deliveryDnaSnapshotQuestions.flatMap((item, index) => {
    const status = statuses[index] ?? (answers[index] === null ? "missing" : "answered");
    if (status === "missing") return [];
    return [
      normaliseSnapshotResponse({
        questionId: item.question.id,
        status,
        answer: answers[index],
        notApplicableReasonText:
          status === "not_applicable" && fixture.input.notApplicableReasonsPresent
            ? "This practice does not apply to our current operating model."
            : undefined,
        respondedAt: "2026-08-03T12:00:00Z",
      }),
    ];
  });
}

describe("PDR-003-005 Delivery DNA Snapshot", () => {
  it("uses exactly the 13 existing practice questions in locked capability order", () => {
    expect(deliveryDnaSnapshotQuestions).toHaveLength(13);
    expect(deliveryDnaSnapshotQuestions.map((item) => item.question.id)).toEqual(
      deliveryDnaSnapshotConfiguration.questionIds,
    );
    expect(
      deliveryDnaSnapshotQuestions.every((item) => item.question.dimension === "practice"),
    ).toBe(true);
    for (const item of deliveryDnaSnapshotQuestions) {
      const source = deliveryDnaCatalogue.capabilities
        .find((capability) => capability.id === item.capabilityId)
        ?.questions.find((question) => question.id === item.question.id);
      expect(item.question.prompt).toBe(source?.prompt);
    }
  });

  for (const rawFixture of deliveryDnaSnapshotConfiguration.fixtures as Fixture[]) {
    it(`passes locked fixture ${rawFixture.id}`, () => {
      if (rawFixture.id === "snapshot_exact_transfer") {
        const transferred = snapshotContinuationRecord({
          questionId: String(rawFixture.input.snapshotQuestionId),
          status: "answered",
          answer: Number(rawFixture.input.answer),
          notApplicableReasonCode: null,
          notApplicableReasonText: null,
          respondedAt: String(rawFixture.input.respondedAt),
        });
        expect(transferred).toMatchObject(rawFixture.expected);
        expect(migration).toContain("'delivery-dna-snapshot', '1.0.0', responded_at");
        expect(migration).toContain(
          "v_assessment_id, question_id, capability_id, to_jsonb(answer), answer",
        );
        expect(linkValueFix).toContain(
          "v_assessment_id, question_id, capability_id, to_jsonb(answer), answer",
        );
        expect(linkValueFix).toContain("REVOKE ALL ON FUNCTION public.link_delivery_dna_snapshot");
        expect(migration).toContain("status = 'linked'");
        expect(migration).not.toContain("status = 'completed', progress = 100");
        expect(migration).not.toContain("assessment_analysis_runs");
        return;
      }
      const actual = evaluateDeliveryDnaSnapshot(responsesFor(rawFixture));
      expect(actual.available).toBe(rawFixture.expected.available);
      expect(actual.positiveSignals.map((item) => item.capabilityId)).toEqual(
        rawFixture.expected.positiveSignalCapabilityIds,
      );
      expect(actual.areasToExplore.map((item) => item.capabilityId)).toEqual(
        rawFixture.expected.areaToExploreCapabilityIds,
      );
      expect(actual.available ? null : actual.reasonCode).toBe(
        rawFixture.expected.reasonCode ?? null,
      );
      expect(actual).not.toHaveProperty("numericScore");
    });
  }

  it("preserves exact answer and not-applicable semantics", () => {
    expect(
      normaliseSnapshotResponse({
        questionId: "ddna.governance.p",
        status: "answered",
        answer: 4,
        respondedAt: "2026-08-03T12:00:00Z",
      }),
    ).toMatchObject({
      questionId: "ddna.governance.p",
      status: "answered",
      answer: 4,
      respondedAt: "2026-08-03T12:00:00Z",
    });
    expect(() =>
      normaliseSnapshotResponse({
        questionId: "ddna.governance.p",
        status: "not_applicable",
      }),
    ).toThrow("SNAPSHOT_NOT_APPLICABLE_REASON_REQUIRED");
    expect(() =>
      normaliseSnapshotResponse({
        questionId: "ddna.governance.f",
        status: "answered",
        answer: 4,
      }),
    ).toThrow("SNAPSHOT_RESPONSE_INVALID");
  });

  it("uses exact approved copy and displays no prohibited intelligence output", () => {
    expect(readFileSync("src/routes/index.tsx", "utf8")).toContain(
      String(deliveryDnaSnapshotConfiguration.copy.websiteCta),
    );
    expect(deliveryDnaSnapshotConfiguration.copy).toMatchObject({
      startHeading: "Discover your Delivery DNA Snapshot",
      resultHeading: "Your Delivery DNA Snapshot",
      continuationCta: "Complete your Delivery DNA Assessment",
    });
    expect(route).toContain("copy.startHeading");
    expect(route).toContain("copy.resultHeading");
    expect(route).toContain("copy.continuationCta");
    expect(route).not.toMatch(/confidence index|maturity band|cross-company comparison/i);
    expect(server).not.toMatch(
      /assessment_analysis_runs|delivery_intelligence_results|scheduleAnalysisHandoff/,
    );
  });

  it("keeps anonymous acquisition data private, opaque, bounded and PII-free", () => {
    expect(server).toContain('randomBytes(32).toString("base64url")');
    expect(server).toContain("HttpOnly; SameSite=Lax");
    expect(migration).toContain("expires_at = created_at + interval '24 hours'");
    expect(migration).toContain("cleanup_expired_delivery_dna_snapshots");
    expect(migration).not.toMatch(
      /snapshot_sessions[\s\S]{0,1200}(email|first_name|last_name|contact_name)/i,
    );
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("starts a fresh anonymous session without mutating a completed or linked Snapshot", () => {
    expect(route).toContain("Start a new Snapshot");
    expect(route).toContain("deliveryDnaSnapshotApi.start(true)");
    expect(client).toContain("JSON.stringify({ restart })");
    expect(apiRoute).toContain("body.restart === true");
    expect(server).toContain("const existing = restart ? null : await sessionForRequest(request)");
    expect(server).not.toMatch(/restart[\s\S]{0,500}\.update\(/);
  });

  it("limits analytics to approved event and step fields", () => {
    expect(safeSnapshotAnalyticsEvent("snapshot_step_progressed", 4)).toEqual({
      eventType: "snapshot_step_progressed",
      stepNumber: 4,
    });
    expect(() => safeSnapshotAnalyticsEvent("snapshot_answered", 4)).toThrow(
      "SNAPSHOT_ANALYTICS_INVALID",
    );
    expect(migration).toMatch(
      /delivery_dna_snapshot_funnel_events \([\s\S]*event_type[\s\S]*step_number[\s\S]*occurred_at/,
    );
    expect(migration).not.toMatch(
      /delivery_dna_snapshot_funnel_events[\s\S]{0,500}(question_id|answer|email|organisation_name)/i,
    );
  });

  it("links atomically, tenant-scoped and double-click-safe without completion or analysis", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("membership.user_id = p_user_id");
    expect(migration).toContain("workspace.organisation_id = p_organisation_id");
    expect(migration).toContain("RETURN v_snapshot.assessment_session_id");
    expect(migration).toContain("p_consent IS DISTINCT FROM true");
    expect(migration).toContain("v_response_count <> 13 OR v_answered_count < 9");
    expect(migration).toContain("'delivery-dna', p_manifest_metadata, 'in_progress'");
    expect(migration).not.toContain("publish_delivery_intelligence_result");
  });
});
