import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  deliveryDnaSnapshotConfiguration,
  deliveryDnaSnapshotConfigurationV1,
  deliveryDnaSnapshotQuestions,
  evaluateDeliveryDnaSnapshot,
  indicativeSnapshotMaturity,
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
const v11Migration = readFileSync(
  "supabase/migrations/20260803220000_delivery_dna_snapshot_v1_1.sql",
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
const preparation = readFileSync("src/components/delivery-dna/snapshot-preparation.tsx", "utf8");
const radar = readFileSync("src/components/delivery-dna/snapshot-radar.tsx", "utf8");
const shell = readFileSync("src/components/delivery-dna/snapshot-shell.tsx", "utf8");
const brandStyles = readFileSync("src/styles/snapshot-brand.css", "utf8");
const logo = readFileSync("src/components/logo.tsx", "utf8");
const ribbon = readFileSync("src/components/ribbon.tsx", "utf8");
const markAsset = JSON.parse(
  readFileSync("src/assets/deliveryiq-mark.png.asset.json", "utf8"),
) as Record<string, unknown>;
const horizontalAsset = JSON.parse(
  readFileSync("src/assets/deliveryiq-logo-horizontal.png.asset.json", "utf8"),
) as Record<string, unknown>;

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

function assertDirectionalFixture(rawFixture: Fixture) {
  const responses = responsesFor(rawFixture);
  const actual = evaluateDeliveryDnaSnapshot(responses);
  expect(actual.available).toBe(rawFixture.expected.available);
  if ("positiveSignalCapabilityIds" in rawFixture.expected) {
    expect(actual.positiveSignals.map((item) => item.capabilityId)).toEqual(
      rawFixture.expected.positiveSignalCapabilityIds,
    );
  }
  if ("areaToExploreCapabilityIds" in rawFixture.expected) {
    expect(actual.areasToExplore.map((item) => item.capabilityId)).toEqual(
      rawFixture.expected.areaToExploreCapabilityIds,
    );
  }
  if ("reasonCode" in rawFixture.expected) {
    expect(actual.reasonCode).toBe(rawFixture.expected.reasonCode);
  }
  if ("answeredCount" in rawFixture.expected) {
    expect(actual.answeredCount).toBe(rawFixture.expected.answeredCount);
  }
  if ("answerSum" in rawFixture.expected) {
    expect(
      responses.reduce(
        (total, response) => total + (response.status === "answered" ? Number(response.answer) : 0),
        0,
      ),
    ).toBe(rawFixture.expected.answerSum);
  }
  if ("indicativeMaturityLevel" in rawFixture.expected) {
    expect(actual.indicativeMaturityLevel).toBe(rawFixture.expected.indicativeMaturityLevel);
  }
  if ("profileValuesByCapabilityOrder" in rawFixture.expected) {
    expect(actual.profile.map((axis) => axis.value)).toEqual(
      rawFixture.expected.profileValuesByCapabilityOrder,
    );
  }
  expect(actual).not.toHaveProperty("numericScore");
  expect(actual).not.toHaveProperty("authoritativeBand");
}

describe("PDR-003-005/A v1.0 historical compatibility", () => {
  it("keeps all eight historical machine-readable fixtures passing unchanged", () => {
    expect(deliveryDnaSnapshotConfigurationV1.fixtures).toHaveLength(8);
    for (const fixture of deliveryDnaSnapshotConfigurationV1.fixtures as Fixture[]) {
      if (fixture.id === "snapshot_exact_transfer") {
        expect(
          snapshotContinuationRecord(
            {
              questionId: String(fixture.input.snapshotQuestionId),
              status: "answered",
              answer: Number(fixture.input.answer),
              notApplicableReasonCode: null,
              notApplicableReasonText: null,
              respondedAt: String(fixture.input.respondedAt),
            },
            "1.0.0",
          ),
        ).toMatchObject(fixture.expected);
      } else {
        assertDirectionalFixture(fixture);
      }
    }
  });
});

describe("PDR-003-005/A v1.1 premium Delivery DNA Snapshot", () => {
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

  it("passes all 14 locked v1.1.0 fixtures exactly", () => {
    expect(deliveryDnaSnapshotConfiguration.fixtures).toHaveLength(14);
    for (const fixture of deliveryDnaSnapshotConfiguration.fixtures as Fixture[]) {
      if (fixture.id === "snapshot_exact_transfer") {
        const transferred = snapshotContinuationRecord({
          questionId: String(fixture.input.snapshotQuestionId),
          status: "answered",
          answer: Number(fixture.input.answer),
          notApplicableReasonCode: null,
          notApplicableReasonText: null,
          respondedAt: String(fixture.input.respondedAt),
        });
        expect(transferred).toMatchObject(fixture.expected);
      } else {
        assertDirectionalFixture(fixture);
      }
    }
  });

  it("uses every unrounded lower-inclusive maturity boundary", () => {
    expect(indicativeSnapshotMaturity([2, 2, 2, 2, 2, 2, 3, 3, 3, 3])).toBe("emerging");
    expect(indicativeSnapshotMaturity([2, 2, 2, 2, 2, 3, 3, 3, 3, 3])).toBe("developing");
    expect(indicativeSnapshotMaturity([3, 3, 3, 3, 3, 3, 4, 4, 4, 4])).toBe("developing");
    expect(indicativeSnapshotMaturity([3, 3, 3, 3, 3, 4, 4, 4, 4, 4])).toBe("established");
    expect(indicativeSnapshotMaturity([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5])).toBe("established");
    expect(indicativeSnapshotMaturity([4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5])).toBe("leading");
    expect(indicativeSnapshotMaturity([5, 5, 5, 5, 5, 5, 5, 5, 5])).toBe("leading");
    expect(indicativeSnapshotMaturity([5, 5, 5, 5, 5, 5, 5, 5])).toBeNull();
  });

  it("excludes N/A from maturity and preserves it as a visible chart gap", () => {
    const fixture = (deliveryDnaSnapshotConfiguration.fixtures as Fixture[]).find(
      (candidate) => candidate.id === "snapshot_nine_answered_four_not_applicable",
    );
    expect(fixture).toBeDefined();
    const result = evaluateDeliveryDnaSnapshot(responsesFor(fixture!));
    expect(result.available).toBe(true);
    expect(result.indicativeMaturityLevel).toBe("developing");
    expect(result.profile.slice(9).map((axis) => axis.value)).toEqual([null, null, null, null]);
    expect(result.profile.slice(9).map((axis) => axis.responseLabel)).toEqual([
      "N/A",
      "N/A",
      "N/A",
      "N/A",
    ]);
  });

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

  it("implements save-first auto-advance, failure recovery, Back/edit and explicit N/A", () => {
    expect(route).toContain("await save.mutateAsync(input)");
    expect(route).toContain("interaction.selectionConfirmationMilliseconds");
    expect(route).toContain("onPrepare()");
    expect(route).toContain("We couldn’t save that response. Your selection is still here.");
    expect(route).toContain("failedInput");
    expect(route).toContain("> Back");
    expect(route).toContain("Save and continue");
    expect(route).toContain("current && !save.isPending");
    expect(route.indexOf("await save.mutateAsync(input)")).toBeLessThan(
      route.indexOf("move(index + 1)"),
    );
  });

  it("keeps keyboard traversal explicit and moves focus after advance", () => {
    expect(route).toContain('role="radiogroup"');
    expect(route).toContain('role="radio"');
    expect(route).toContain("aria-checked={selected}");
    expect(route).toContain('["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]');
    expect(route).toContain("optionRefs.current[next]?.focus()");
    expect(route).toContain('["1", "2", "3", "4", "5"]');
    expect(route).toContain("headingRef.current?.focus()");
    expect(route).toContain('aria-live="polite"');
  });

  it("provides the truthful timed preparation, slow, error and reduced-motion states", () => {
    expect(preparation).toContain("policy.minimumVisibleMilliseconds");
    expect(preparation).toContain("policy.slowStateAtMilliseconds");
    expect(preparation).toContain("copy.preparationHeading");
    expect(preparation).toContain("copy.preparationBody");
    expect(preparation).toContain("copy.slowPreparationBody");
    expect(preparation).toContain("copy.readyHeading");
    expect(preparation).toContain("Your saved responses are safe.");
    expect(preparation).toMatch(
      /setShowReady\(true\);\s*\}, \[elapsed, resultReady, showReady\]\);\s*useEffect\(\(\) => \{\s*if \(!showReady\) return;\s*finishTimer\.current = setTimeout\(onReady, 700\)/,
    );
    for (const step of deliveryDnaSnapshotConfiguration.preparationPolicy.steps) {
      expect(preparation).toContain("step.copy");
      expect(step.copy).not.toMatch(
        /AI analysis|benchmarking|external data comparison|evidence validation|Delivery Intelligence Engine analysis/i,
      );
    }
    expect(brandStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("renders 13 chart axes, true N/A gaps and an accessible ordered equivalent", () => {
    expect(radar).toContain("data-axis-count={profile.length}");
    expect(radar).toContain("connectNulls={false}");
    expect(radar).toContain('" · N/A"');
    expect(radar).toContain("<ol");
    expect(radar).toContain('aria-label="Accessible indicative delivery profile"');
    expect(radar).toContain("axis.capabilityLabel");
    expect(radar).toContain("axis.responseLabel");
    expect(radar).toContain("sm:grid-cols-2");
    expect(radar).toContain("lg:grid-cols-3");
  });

  it("uses the exact premium result copy and hierarchy without numeric intelligence claims", () => {
    expect(deliveryDnaSnapshotConfiguration.copy).toMatchObject({
      startHeading: "Discover your Delivery DNA Snapshot",
      readyHeading: "Your Snapshot is ready",
      resultHeading: "Your indicative delivery maturity",
      profileHeading: "Your indicative delivery profile",
      continuationHeading: "Turn your Snapshot into your complete Delivery DNA",
      continuationCtaAnonymous: "Complete my Delivery DNA",
      continuationCtaLinked: "Continue my Delivery DNA",
      restartCta: "Start a new Snapshot",
    });
    const orderedMarkers = [
      "copy.readyHeading",
      "copy.resultHeading",
      "copy.resultCaveat",
      "copy.profileHeading",
      "maturity.interpretation",
      "copy.positiveHeading",
      "copy.exploreHeading",
      "deliveryDnaCommercialCopy.savePanel.heading",
      "copy.restartCta",
    ];
    for (let index = 1; index < orderedMarkers.length; index += 1) {
      expect(route.indexOf(orderedMarkers[index - 1])).toBeLessThan(
        route.indexOf(orderedMarkers[index]),
      );
    }
    expect(route).not.toMatch(
      /maturity score|authoritative maturity|benchmark|confidence index|percentage|roadmapGenerated/i,
    );
    expect(route).not.toContain("{progress}%");
  });

  it("uses the dedicated dark acquisition shell and exact pinned brand sources", () => {
    expect(route).toContain("<SnapshotAcquisitionShell>");
    expect(route).not.toContain("AppShell");
    expect(route).not.toContain("IdentityMenu");
    expect(shell).toContain("<Logo onNavy");
    expect(shell).not.toMatch(
      /Workspace|GitHub Sync|runtime dashboard|design system|product administration/,
    );
    expect(markAsset).toMatchObject({
      asset_id: "85519077-9014-4033-b924-06c965dc5a68",
      project_id: "a3f77a8e-ca53-4497-8623-bd83d9046aa1",
      url: "https://deliveryiq.co.uk/__l5e/assets-v1/85519077-9014-4033-b924-06c965dc5a68/deliveryiq-mark.png",
    });
    expect(horizontalAsset).toMatchObject({
      asset_id: "06c48f5f-1879-40dc-92c4-ca0b5da43b1e",
      project_id: "a3f77a8e-ca53-4497-8623-bd83d9046aa1",
    });
    expect(ribbon).toContain('import markAsset from "@/assets/deliveryiq-mark.png.asset.json"');
    expect(ribbon).toContain("Never distorted or rotated");
    expect(logo).toContain("Delivery");
    expect(logo).toContain("Smarter");
    expect(brandStyles).toContain("#090e1a");
    expect(brandStyles).toContain("#111827");
    expect(brandStyles).toContain("#182131");
    expect(brandStyles).toContain("#14b8a6");
    expect(brandStyles).toContain("#2563eb");
    expect(brandStyles).toContain("#7c3aed");
    expect(brandStyles).toContain('font-family: "Manrope"');
    expect(brandStyles).toContain("data:font/woff2;base64,d09GMg");
  });

  it("pins new sessions to 1.1.0 and safely reprojects eligible v1.0 results", () => {
    expect(v11Migration).toContain(
      "token_hash, configuration_version, presentation_policy_version",
    );
    expect(v11Migration).toContain("p_token_hash, '1.1.0', '1.1.0'");
    expect(v11Migration).toContain("provenance_version IN ('1.0.0', '1.1.0')");
    expect(v11Migration).toContain(
      "'delivery-dna-snapshot', v_snapshot.configuration_version, responded_at",
    );
    expect(v11Migration).toContain("SNAPSHOT_CONFIGURATION_VERSION_IMMUTABLE");
    expect(v11Migration).toContain("SNAPSHOT_PRESENTATION_VERSION_TRANSITION_INVALID");
    expect(v11Migration).toContain("delivery_dna_snapshot_versions_guard");
    expect(server).toContain('session.configuration_version === "1.0.0"');
    expect(server).toContain('presentation_policy_version: "1.1.0"');
    expect(server).toContain(
      "snapshotContinuationRecord(response, resolved.session.configuration_version)",
    );
    expect(server).not.toMatch(
      /presentation_policy_version[\s\S]{0,300}(delivery_intelligence|assessment_analysis_runs)/,
    );
  });

  it("keeps anonymous acquisition data private, opaque, bounded and PII-free", () => {
    expect(server).toContain('randomBytes(32).toString("base64url")');
    expect(server).toContain("HttpOnly; SameSite=${sameSite}");
    expect(server).toContain('secure ? "None; Secure; Partitioned" : "Lax"');
    expect(server).toContain("request.headers.get(SESSION_HEADER)?.trim()");
    expect(client).toContain("window.sessionStorage.setItem(snapshotSessionKey, token)");
    expect(client).toContain('"x-deliveryiq-snapshot-session": sessionToken');
    expect(migration).toContain("expires_at = created_at + interval '24 hours'");
    expect(migration).toContain("cleanup_expired_delivery_dna_snapshots");
    expect(migration).not.toMatch(
      /snapshot_sessions[\s\S]{0,1200}(email|first_name|last_name|contact_name)/i,
    );
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("starts a fresh anonymous session without mutating a completed or linked Snapshot", () => {
    expect(route).toContain("copy.restartCta");
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
    expect(deliveryDnaSnapshotConfiguration.privacyPolicy.analyticsProhibitedFields).toContain(
      "indicativeMaturityLevel",
    );
  });

  it("links atomically, tenant-scoped and double-click-safe without completion or analysis", () => {
    expect(v11Migration).toContain("FOR UPDATE");
    expect(v11Migration).toContain("membership.user_id = p_user_id");
    expect(v11Migration).toContain("workspace.organisation_id = p_organisation_id");
    expect(v11Migration).toContain("RETURN v_snapshot.assessment_session_id");
    expect(v11Migration).toContain("p_consent IS DISTINCT FROM true");
    expect(v11Migration).toContain("v_response_count <> 13 OR v_answered_count < 9");
    expect(v11Migration).toContain("'delivery-dna', p_manifest_metadata, 'in_progress'");
    expect(v11Migration).not.toContain("publish_delivery_intelligence_result");
    expect(migration).toContain(
      "v_assessment_id, question_id, capability_id, to_jsonb(answer), answer",
    );
    expect(linkValueFix).toContain(
      "v_assessment_id, question_id, capability_id, to_jsonb(answer), answer",
    );
  });
});
