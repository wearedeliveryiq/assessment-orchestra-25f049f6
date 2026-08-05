/* eslint-disable @typescript-eslint/no-explicit-any -- locked fixture inputs are intentionally heterogeneous by stage */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import golden from "../docs/01-product/delivery-dna/DIQ-100B v2.1.0 Delivery DNA Golden Fixtures.json";
import commercial from "../docs/01-product/delivery-intelligence/configuration/PDR-003-004A v2.1.0 Delivery DNA Commercial Offer Configuration.json";
import {
  analyseCanonicalInputV2,
  aggregateDeliveryDnaV2Domain,
  aggregateDeliveryDnaV2Overall,
  allocateDeliveryDnaV2Roadmap,
  confidenceBand,
  dedupeDeliveryDnaV2Recommendations,
  deliveryDnaV2Band,
  deliveryDnaV2CapabilityConfidence,
  deliveryDnaV2ConfidenceFromFactors,
  deliveryDnaV2PatternMatches,
  eligibleDeliveryDnaV2Recommendations,
  resolveDeliveryDnaV2Patterns,
  scoreDeliveryDnaV2Capability,
  selectDeliveryDnaV2Findings,
  sequenceDeliveryDnaV2Roadmap,
  sequenceDeliveryDnaRoadmapGraph,
  sortDeliveryDnaV2RecommendationCandidates,
} from "@/lib/delivery-dna/analysis-v2";
import {
  DELIVERY_DNA_V2_CANONICAL_CONTENT_DIGEST,
  deliveryDnaV2Capabilities,
  deliveryDnaV2Catalogue,
  deliveryDnaV2CutoverDecision,
  deliveryDnaV2QuestionManifest,
  deliveryDnaV2SnapshotQuestions,
} from "@/lib/delivery-dna/catalogue-v2";
import {
  deliveryDnaContextEligible,
  selectOverviewContext,
  selectSnapshotContext,
} from "@/lib/delivery-dna/context-v2";
import {
  deliveryDnaSnapshotV2Configuration,
  evaluateDeliveryDnaSnapshotV2,
  normaliseSnapshotV2Response,
  snapshotV2Level,
} from "@/lib/delivery-dna/snapshot-v2";
import {
  deliveryDnaOverviewOffer,
  evaluateOverviewPaymentFixture,
  savedSnapshotFixtureProjection,
} from "@/lib/delivery-dna/overview-offer";
import { renderDeliveryDnaOverviewPdf } from "@/lib/delivery-dna/overview-report.server";
import { renderDeliveryDnaSnapshotPdf } from "@/lib/delivery-dna/snapshot-report.server";
import { buildCoreTrace } from "@/lib/delivery-intelligence/trace-builder";
import { validateTraceGraph } from "@/lib/delivery-intelligence/traceability";
import { projectDeliveryDnaOverviewResult } from "@/lib/delivery-intelligence/projection";
import { evaluateAnalysisEligibility } from "@/lib/analysis/eligibility";
import evidenceCatalogue from "../docs/01-product/delivery-intelligence/configuration/DIQ-204A Delivery Evidence Catalogue.json";

const fixture = (id: string) => golden.fixtures.find((item) => item.id === id)!;
const capability = deliveryDnaV2Capabilities[0];
const responseSet = (values: Record<string, { value?: number; status: string; reason?: string }>) =>
  capability.questions.map((question) => {
    const value = values[question.role];
    return {
      questionId: question.id,
      status: value.status as "answered" | "missing" | "not_applicable",
      answer: value.value ?? null,
      reason: value.reason ?? null,
    };
  });
const snapshotResponses = (answers: Array<number | null>) =>
  deliveryDnaV2SnapshotQuestions.map((item, index) => ({
    questionId: item.question.id,
    status: answers[index] === null ? ("not_applicable" as const) : ("answered" as const),
    answer: answers[index],
    notApplicableReasonCode: answers[index] === null ? "customer_declared_not_applicable" : null,
    notApplicableReasonText: answers[index] === null ? "Genuinely not applicable." : null,
    respondedAt: "2026-08-05T00:00:00.000Z",
  }));

const canonicalInputV2 = {
  schemaVersion: "deliveryiq.analysis-input/2.0.0",
  engineVersion: "deliveryiq.intelligence-engine/1.0.0",
  assessment: {
    sessionId: "assessment-v2",
    assessmentType: "delivery-dna",
    revision: 1,
    organisationId: "organisation-a",
    workspaceId: "workspace-a",
    completedAt: "2026-08-05T00:00:00.000Z",
    consentBasis: "delivery_dna_snapshot_continuation",
    evidenceRecencyDeclaration: "within_90_days",
    perspectiveBreadthDeclaration: "three_or_more_groups",
  },
  knowledgePack: { id: "delivery-dna", version: "2.1.0", questionSetVersion: "2.1.0" },
  requestedMode: "workspace" as const,
  responses: deliveryDnaV2Capabilities.flatMap((capability) =>
    capability.questions.map((question) => ({
      answerId: `assessment-v2:${question.id}`,
      answerVersion: "2026-08-05T00:00:00.000Z",
      questionId: question.id,
      questionVersion: "2.1.0",
      sectionId: capability.id,
      value: 1,
      status: "answered" as const,
      exclusionReason: null,
      respondentGroupId: null,
      evidenceAt: "2026-08-05T00:00:00.000Z",
    })),
  ),
};

describe("DIQ-100B Delivery DNA 2.1 locked golden fixtures", () => {
  it("registers all 45 locked fixtures exactly once", () => {
    expect(golden.fixtures).toHaveLength(45);
    expect(new Set(golden.fixtures.map((item) => item.id)).size).toBe(45);
  });

  it("validates the exact five-domain, 15-capability, 45-question, 180-anchor catalogue", () => {
    const expected = fixture("catalogue_exact_structure").expected as Record<string, unknown>;
    expect(deliveryDnaV2Catalogue.domains).toHaveLength(expected.domainCount as number);
    expect(deliveryDnaV2Capabilities).toHaveLength(expected.capabilityCount as number);
    expect(deliveryDnaV2QuestionManifest).toHaveLength(expected.questionCount as number);
    expect(Object.keys(deliveryDnaV2Catalogue.answerOptionsByQuestionId)).toHaveLength(45);
    expect(Object.values(deliveryDnaV2Catalogue.answerOptionsByQuestionId).flat()).toHaveLength(
      180,
    );
    const snapshotExpected = fixture("catalogue_exact_snapshot_questions").expected as {
      questionIds: string[];
    };
    expect(deliveryDnaV2SnapshotQuestions.map((item) => item.question.id)).toEqual(
      snapshotExpected.questionIds,
    );
    const migration = readFileSync(
      "supabase/migrations/20260805020000_delivery_dna_2_1_cutover.sql",
      "utf8",
    );
    for (const item of deliveryDnaV2SnapshotQuestions) {
      expect(migration).toContain(
        `question_id = '${item.question.id}' AND capability_id = '${item.capabilityId}' AND capability_order = ${item.capabilityOrder}`,
      );
    }
    expect(migration).not.toContain("DROP CONSTRAINT delivery_dna_snapshot_responses_answer_check");
    expect(migration).not.toContain(
      "DROP CONSTRAINT delivery_dna_snapshot_funnel_events_step_number_check",
    );
    expect(migration).toContain("public.create_delivery_dna_snapshot_v2(text, text, text, text)");
    expect(migration).toContain("FROM service_role");
    expect(migration).not.toMatch(/INSERT INTO public\.delivery_dna_overview_access_grants/i);
  });

  it("matches the locked founder wording reconciliation and canonical content digest", () => {
    const expected = fixture("catalogue_source_reconciliation").expected as Record<string, unknown>;
    const { runtimeParaphraseAllowed, ...reconciliation } = expected;
    expect(runtimeParaphraseAllowed).toBe(false);
    expect(deliveryDnaV2Catalogue.sourceReconciliation).toMatchObject(reconciliation);
    const canonical = deliveryDnaV2Capabilities.flatMap((capability) =>
      capability.questions.map((question) => ({
        questionId: question.id,
        prompt: question.prompt,
        role: question.role,
        weight: question.weight,
        answers: deliveryDnaV2Catalogue.answerOptionsByQuestionId[
          question.id as keyof typeof deliveryDnaV2Catalogue.answerOptionsByQuestionId
        ].map(({ id, value, text }) => ({ id, value, text })),
      })),
    );
    expect(createHash("sha256").update(JSON.stringify(canonical)).digest("hex")).toBe(
      DELIVERY_DNA_V2_CANONICAL_CONTENT_DIGEST,
    );
  });

  it("passes scoring, availability and boundary fixtures", () => {
    const anchors = fixture("capability_score_four_anchor_levels") as any;
    for (const testCase of anchors.input.cases) {
      const actual = scoreDeliveryDnaV2Capability(capability.id, responseSet(testCase.responses));
      const { id: _id, ...expected } = anchors.expected.cases.find(
        (item: any) => item.id === testCase.id,
      );
      expect(actual).toMatchObject(expected);
    }
    for (const id of [
      "capability_weighted_midpoint",
      "capability_missing_snapshot_two_answers_available",
      "capability_not_applicable_renormalises",
      "capability_single_answer_unavailable",
    ]) {
      const current = fixture(id) as any;
      const actual = scoreDeliveryDnaV2Capability(
        capability.id,
        responseSet(current.input.responses),
      );
      expect(actual.available).toBe(current.expected.available);
      expect(actual.rawScore).toBe(current.expected.rawScore);
      expect(actual.displayScore).toBe(current.expected.displayScore);
      expect(actual.band).toBe(current.expected.band);
      expect(actual.eligibleWeight).toBe(current.expected.eligibleWeight);
    }
    const boundaries = fixture("band_exact_boundaries") as any;
    expect(boundaries.input.rawScores.map(deliveryDnaV2Band)).toEqual(boundaries.expected.bands);
  });

  it("keeps missing and reason-required N/A non-contributing", () => {
    expect(() =>
      normaliseSnapshotV2Response({
        questionId: deliveryDnaV2SnapshotQuestions[0].question.id,
        status: "not_applicable",
        notApplicableReasonText: "",
      }),
    ).toThrow("SNAPSHOT_NOT_APPLICABLE_REASON_REQUIRED");
    expect(fixture("not_applicable_reason_required").expected).toMatchObject({
      valid: false,
      retryable: true,
    });
    expect(fixture("skip_is_missing_not_not_applicable").expected).toMatchObject({
      status: "missing",
      notApplicable: false,
    });
    const digital = fixture("digital_ai_not_applicable_no_penalty").expected;
    expect(digital).toMatchObject({ available: false, rawScore: null, penaltyApplied: false });
  });

  it("aggregates domains and overall only at locked coverage", () => {
    const domainFixture = fixture("domain_aggregation_and_availability") as any;
    for (const testCase of domainFixture.input.cases) {
      const ids = deliveryDnaV2Capabilities.slice(0, 3).map((item) => item.id);
      const actual = aggregateDeliveryDnaV2Domain(
        "direction_value",
        Object.fromEntries(ids.map((id, index) => [id, testCase.capabilities[index]])),
      );
      const expected = domainFixture.expected.cases.find((item: any) => item.id === testCase.id);
      expect(actual.available).toBe(expected.available);
      expect(actual.rawScore).toBe(expected.rawScore ?? null);
    }
    const overallFixture = fixture("overall_aggregation_coverage") as any;
    for (const testCase of overallFixture.input.cases) {
      const flat = testCase.domainCapabilityScores.flat();
      const actual = aggregateDeliveryDnaV2Overall(
        Object.fromEntries(deliveryDnaV2Capabilities.map((item, index) => [item.id, flat[index]])),
      );
      const expected = overallFixture.expected.cases.find((item: any) => item.id === testCase.id);
      expect(actual.available).toBe(expected.available);
    }
  });

  it("passes Snapshot levels, minimum coverage, ties and disclosure boundaries", () => {
    const levels = fixture("snapshot_four_level_outputs") as any;
    for (const testCase of levels.input.cases) {
      const actual = evaluateDeliveryDnaSnapshotV2(snapshotResponses(testCase.answers));
      const expected = levels.expected.cases.find((item: any) => item.id === testCase.id);
      expect(actual.available).toBe(true);
      expect(actual.indicativeMaturityLevel).toBe(expected.overallLevel);
      expect(actual.profile.map((item) => item.level)).toEqual(expected.domainLevels);
    }
    const boundaries = fixture("snapshot_exact_level_boundaries") as any;
    expect(boundaries.input.means.map(snapshotV2Level)).toEqual(boundaries.expected.levels);
    const ties = fixture("snapshot_signal_ties") as any;
    const tieAnswers = [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    const tied = evaluateDeliveryDnaSnapshotV2(snapshotResponses(tieAnswers));
    expect(tied.positiveSignals.map((item) => item.domainId)).toEqual(
      ties.expected.positiveSignals,
    );
    expect(tied.areasToExplore.map((item) => item.domainId)).toEqual(ties.expected.areasToExplore);
    expect(deliveryDnaSnapshotV2Configuration.copy.saveAction).toBe("Save my Snapshot");
    expect(deliveryDnaSnapshotV2Configuration.copy.saveSupporting).toBe(
      "Download your results by saving your Snapshot",
    );
    expect(fixture("snapshot_disclosure_and_cta").expected).toMatchObject({
      numericScoresPresent: false,
      profileAxes: 5,
    });
    const coverage = fixture("snapshot_minimum_coverage") as any;
    for (const testCase of coverage.input.cases) {
      const answers = testCase.answeredByDomain.flatMap((count: number) =>
        [1, 1, 1].map((value, index) => (index < count ? value : null)),
      );
      const actual = evaluateDeliveryDnaSnapshotV2(snapshotResponses(answers));
      const expected = coverage.expected.cases.find((item: any) => item.id === testCase.id);
      expect(actual.available).toBe(expected.available);
      if (!actual.available) expect(actual.reasonCode).toBe(expected.reason);
    }
    const savedBoundary = fixture("saved_snapshot_value_boundary").expected as any;
    expect(
      savedSnapshotFixtureProjection({
        snapshotStatus: "linked",
        authenticated: true,
        overviewAccess: false,
      }),
    ).toMatchObject({
      remainingAssessmentAccessible: false,
      overviewProjectionAvailable: savedBoundary.additionalIntelligence,
    });
    expect(snapshotResponses(Array(15).fill(2))).toHaveLength(savedBoundary.exactResponsesRetained);
  });

  it("passes confidence, finding and deterministic tie fixtures", () => {
    const factors = fixture("confidence_factor_independence") as any;
    for (const testCase of factors.input.cases) {
      const expected = factors.expected.cases.find((item: any) => item.id === testCase.id);
      expect(deliveryDnaV2ConfidenceFromFactors(testCase.factors)).toMatchObject({
        rawConfidence: expected.rawConfidence,
        band: expected.band,
      });
    }
    const confidenceBoundaries = fixture("confidence_exact_boundaries") as any;
    expect(confidenceBoundaries.input.values.map(confidenceBand)).toEqual(
      confidenceBoundaries.expected.bands,
    );
    const cap = fixture("capability_confidence_formula") as any;
    for (const testCase of cap.input.cases) {
      expect(deliveryDnaV2CapabilityConfidence(testCase)).toBe(
        cap.expected.cases.find((item: any) => item.id === testCase.id).confidence,
      );
    }
    const findings = selectDeliveryDnaV2Findings([
      { id: "strength", score: 75, confidence: 50, order: 1 },
      { id: "opportunity", score: 49.999999, confidence: 50, order: 2 },
      { id: "insufficient", score: 0, confidence: 49.999999, order: 3 },
    ]);
    expect(findings.strengths.map((item) => item.id)).toEqual(["strength"]);
    expect(findings.opportunities.map((item) => item.id)).toEqual(["opportunity"]);
    expect(findings.insufficientEvidence.map((item) => item.id)).toEqual(["insufficient"]);
    const ties = fixture("finding_tie_breakers") as any;
    expect(
      selectDeliveryDnaV2Findings(ties.input.candidates).opportunities.map((item) => item.id),
    ).toEqual(ties.expected.orderedOpportunityIds);
    const exact = fixture("finding_exact_thresholds") as any;
    for (const testCase of exact.input.cases) {
      const actual = selectDeliveryDnaV2Findings([
        { id: testCase.id, score: testCase.score, confidence: testCase.confidence, order: 1 },
      ]);
      const classification = actual.strengths.length
        ? "strength"
        : actual.opportunities.length
          ? "priority_opportunity"
          : actual.insufficientEvidence.length
            ? "insufficient_evidence"
            : "neutral";
      expect(classification).toBe(
        exact.expected.cases.find((item: any) => item.id === testCase.id).classification,
      );
    }
  });

  it("passes every pattern positive, negative, confidence and exclusivity fixture", () => {
    const cases = fixture("pattern_positive_and_negative_cases") as any;
    for (const testCase of cases.input.cases) {
      const positiveConfidence = Object.fromEntries(
        Object.keys(testCase.positive).map((id) => [id, 75]),
      );
      const negativeConfidence = Object.fromEntries(
        Object.keys(testCase.negative).map((id) => [id, 75]),
      );
      expect(
        deliveryDnaV2PatternMatches(testCase.patternId, testCase.positive, positiveConfidence),
      ).toBe(true);
      expect(
        deliveryDnaV2PatternMatches(testCase.patternId, testCase.negative, negativeConfidence),
      ).toBe(false);
    }
    const gate = fixture("pattern_confidence_gate") as any;
    expect(
      deliveryDnaV2PatternMatches(gate.input.patternId, gate.input.scores, gate.input.confidences),
    ).toBe(false);
    const conflict = fixture("pattern_exclusive_group_resolution") as any;
    const matched = conflict.input.matched.map((item: any) =>
      deliveryDnaV2Catalogue.patterns.find((pattern) => pattern.id === item.id)!,
    );
    const resolved = resolveDeliveryDnaV2Patterns(matched);
    expect(resolved.retained.map((item) => item.id)).toEqual(conflict.expected.retained);
    expect(resolved.suppressed.map((item) => item.id)).toEqual(
      conflict.expected.suppressed.map((item: any) => item.id),
    );
  });

  it("passes recommendation eligibility, exclusion, rank and dedupe fixtures", () => {
    for (const id of [
      "recommendation_capability_eligibility",
      "recommendation_low_confidence_only",
    ]) {
      const current = fixture(id) as any;
      expect(eligibleDeliveryDnaV2Recommendations(current.input).map((item) => item.id)).toEqual(
        current.expected.eligibleRecommendationIds,
      );
    }
    const excluded = fixture("recommendation_exclusions") as any;
    const eligible = new Set(
      eligibleDeliveryDnaV2Recommendations(excluded.input).map((item) => item.id),
    );
    expect(
      excluded.expected.excludedRecommendationIds.every((id: string) => !eligible.has(id)),
    ).toBe(true);
    const ranking = fixture("recommendation_rank_tie_break") as any;
    expect(
      sortDeliveryDnaV2RecommendationCandidates(ranking.input.candidates).map((item) => item.id),
    ).toEqual(ranking.expected.orderedIds);
    const dedupe = fixture("recommendation_deduplication") as any;
    expect(dedupeDeliveryDnaV2Recommendations(dedupe.input.candidates)).toMatchObject({
      retained: [dedupe.expected.retained],
      removed: dedupe.expected.removed,
    });
  });

  it("passes roadmap dependency, capacity and cycle contracts", () => {
    const sequence = fixture("roadmap_dependency_sequence") as any;
    expect(sequenceDeliveryDnaV2Roadmap(sequence.input.selected, sequence.input.ranks)).toEqual(
      sequence.expected.sequence,
    );
    const allocated = allocateDeliveryDnaV2Roadmap(
      Array.from({ length: 11 }, (_, index) => `item-${index}`),
    );
    expect([
      allocated.day30.length,
      allocated.day60.length,
      allocated.day90.length,
      allocated.unscheduled.length,
    ]).toEqual([3, 3, 4, 1]);
    expect(fixture("roadmap_capacity_and_unscheduled").expected.unscheduledReason).toBe(
      "capacity_exceeded",
    );
    const cycle = fixture("roadmap_dependency_cycle") as any;
    expect(() =>
      sequenceDeliveryDnaRoadmapGraph(
        Object.keys(cycle.input.dependencies),
        { a: 2, b: 1 },
        cycle.input.dependencies,
      ),
    ).toThrow(cycle.expected.errorCode);
  });

  it("selects only approved, relevant, calculation-neutral context", () => {
    expect(fixture("context_snapshot_domain_mapping").expected).toMatchObject({
      maximumItems: 1,
      scoringEffect: "none",
    });
    expect(fixture("context_overview_limits_and_source").expected).toMatchObject({
      maximumItems: 3,
    });
    expect(selectSnapshotContext("insight_adaptation").map((item) => item.evidenceId)).toEqual([
      "context_wellingtone_2026_reporting",
    ]);
    const overview = selectOverviewContext({
      domainIds: deliveryDnaV2Catalogue.domains.map((item) => item.id),
      capabilityIds: [],
    });
    expect(overview.map((item) => item.evidenceId)).toEqual([
      "context_wellingtone_2026_portfolio_capacity",
      "context_wellingtone_2026_benefits",
      "context_wellingtone_2026_sponsorship",
    ]);
    expect(overview[0]).toMatchObject({
      sourcePublisher: "Wellingtone",
      evidenceYear: 2026,
      mandatoryDisclosure:
        "General industry context; not a benchmark or comparison with your organisation.",
    });
    expect(fixture("context_never_changes_result").expected).toMatchObject({
      scoringChanged: false,
      rankingChanged: false,
      changedFields: ["presentation.industryContext"],
    });
    const unavailable = fixture("context_unavailable_omitted") as any;
    const source = evidenceCatalogue.evidenceItems.find(
      (item) => item.id === unavailable.input.mappedEvidenceId,
    )!;
    expect(
      deliveryDnaContextEligible(
        { ...source, status: unavailable.input.evidenceStatus } as never,
        "snapshot_context",
      ),
    ).toBe(false);
  });

  it("passes disclosure, lineage, clean-cutover, tenant and immutability contracts", async () => {
    const core = analyseCanonicalInputV2(canonicalInputV2);
    const trace = await buildCoreTrace(
      {
        id: "run-v2",
        organisationId: "organisation-a",
        workspaceId: "workspace-a",
        configurationSetId: "delivery-dna-product-config-2.1.0",
        configurationVersion: "2.1.0",
        questionSetVersion: "2.1.0",
        input: canonicalInputV2,
      } as never,
      core,
    );
    const traceExpected = fixture("traceability_complete_chain").expected as any;
    const nodeTypes = new Set(trace.nodes.map((node) => node.nodeType));
    expect(traceExpected.requiredNodeTypes.filter((type: string) => !nodeTypes.has(type))).toEqual(
      traceExpected.missingNodes,
    );
    expect(validateTraceGraph(trace)).toMatchObject({ valid: true, errors: [] });
    const traceSerialised = JSON.stringify(trace);
    for (const field of traceExpected.versionFieldsPresent)
      expect(traceSerialised).toContain(field);

    const snapshot = evaluateDeliveryDnaSnapshotV2(snapshotResponses(Array(15).fill(2)));
    const disclosure = fixture("workspace_vs_snapshot_disclosure").expected as any;
    expect(snapshot.available).toBe(true);
    const snapshotProjection = {
      overallIndicativeLevel: snapshot.available ? snapshot.indicativeMaturityLevel : null,
      domainIndicativeLevels: snapshot.available ? snapshot.profile.map((item) => item.level) : [],
      profile: snapshot.available ? snapshot.profile : [],
      positiveSignals: snapshot.available ? snapshot.positiveSignals : [],
      areasToExplore: snapshot.available ? snapshot.areasToExplore : [],
      industryContext: [],
      caveat: deliveryDnaSnapshotV2Configuration.copy.caveat,
      savedSnapshotCta: deliveryDnaSnapshotV2Configuration.copy.saveAction,
    };
    expect(Object.keys(snapshotProjection)).toEqual(disclosure.snapshot.allowed);
    for (const denied of disclosure.snapshot.denied)
      expect(snapshotProjection).not.toHaveProperty(denied);
    const snapshotPdf = new TextDecoder().decode(
      renderDeliveryDnaSnapshotPdf({
        status: "linked",
        configurationVersion: "2.1.0",
        presentationPolicyVersion: "2.1.0",
        expiresAt: "2026-08-06T00:00:00.000Z",
        scopeType: "whole_organisation",
        scopeDisplayName: "Example organisation",
        responses: snapshotResponses(Array(15).fill(2)),
        result: { ...snapshot, industryContext: [] },
        linkedAssessmentId: "assessment-v2",
      } as never),
    );
    expect(snapshotPdf.startsWith("%PDF-1.4")).toBe(true);
    expect(snapshotPdf).toContain("Your indicative Delivery DNA profile");
    expect(snapshotPdf).toContain(
      "This is an indicative view based on one Snapshot signal from each Delivery DNA capability.",
    );
    expect(snapshotPdf).toContain(
      "Delivery DNA result and may change when the supporting questions are assessed.",
    );
    expect(snapshotPdf).not.toContain("confidence");
    expect(snapshotPdf).not.toContain("recommendation");

    const overview = projectDeliveryDnaOverviewResult({
      stored: {
        id: "result-v2",
        analysisRunId: "run-v2",
        resultHash: "a".repeat(64),
        organisationId: "organisation-a",
        workspaceId: "workspace-a",
        publishedAt: "2026-08-05T00:00:00.000Z",
        canonicalResult: { ...core, generatedAt: "2026-08-05T00:00:00.000Z" },
      } as never,
      portfolio: null,
      access: {
        assessmentId: "assessment-v2",
        savedSnapshotId: "snapshot-v2",
        access: "paid",
        permitted: true,
        offer: null,
        safeStatus: "available",
      },
    });
    expect(overview).toMatchObject({
      schemaVersion: "deliveryiq.delivery-dna-overview/2.1.0",
      domains: expect.any(Array),
      capabilities: expect.any(Array),
      confidence: expect.any(Object),
      recommendations: expect.any(Array),
      roadmapDirection: expect.any(Object),
      industryContext: expect.any(Array),
      downloadableReport: { sectionCount: 7 },
      action: { available: false },
    });
    expect(overview.domains).toHaveLength(5);
    expect(overview.capabilities).toHaveLength(15);
    expect(overview.recommendations.length).toBeLessThanOrEqual(3);
    const report = new TextDecoder().decode(renderDeliveryDnaOverviewPdf(overview));
    expect(report.startsWith("%PDF-1.4")).toBe(true);
    expect(report).toContain(overview.executiveSummary.overallPosition);
    expect(report).toContain("Five-domain profile");
    expect(report).toContain("Method, limitations and sources");
    expect(report).not.toContain("customerDecisionControls");

    const cutover = fixture("clean_21_cutover_from_1") as any;
    expect(deliveryDnaV2CutoverDecision(cutover.input)).toEqual(cutover.expected);
    const version20 = fixture("version20_to_21_translation_prohibited") as any;
    expect(deliveryDnaV2CutoverDecision(version20.input)).toEqual(version20.expected);
    const before = JSON.stringify(core);
    const tenant = fixture("tenant_and_immutable_projection_contract") as any;
    const tenantDecision = await evaluateAnalysisEligibility({
      assessmentId: "assessment-v2",
      assessmentRevision: 1,
      organisationId: tenant.input.assessmentTenantId,
      workspaceId: "workspace-a",
      expectedOrganisationId: tenant.input.analysisRunTenantId,
      expectedWorkspaceId: "workspace-a",
      completed: true,
      assessmentType: "delivery-dna",
      packId: "delivery-dna",
      packVersion: "2.1.0",
      questionSetId: "delivery-dna",
      questionSetVersion: "2.1.0",
      questionIds: [...deliveryDnaV2QuestionManifest],
      configurationSetId: "delivery-dna-product-config-2.1.0",
    });
    expect(tenantDecision.status).toBe("ineligible");
    expect(tenantDecision.primaryReason).toBe("ANALYSIS_ELIGIBILITY_TENANT_MISMATCH");
    const eligibleDecision = await evaluateAnalysisEligibility({
      assessmentId: "assessment-v2",
      assessmentRevision: 1,
      organisationId: "organisation-a",
      workspaceId: "workspace-a",
      expectedOrganisationId: "organisation-a",
      expectedWorkspaceId: "workspace-a",
      completed: true,
      assessmentType: "delivery-dna",
      packId: "delivery-dna",
      packVersion: "2.1.0",
      questionSetId: "delivery-dna",
      questionSetVersion: "2.1.0",
      questionIds: [...deliveryDnaV2QuestionManifest],
      configurationSetId: "delivery-dna-product-config-2.1.0",
    });
    expect(eligibleDecision).toMatchObject({ status: "eligible", reasons: [] });
    expect(JSON.stringify(core)).toBe(before);
  });
});

describe("PDR-003-004A 2.1 locked commercial fixtures", () => {
  it("registers all ten fixtures and the exact server-side offer", () => {
    expect(commercial.fixtures).toHaveLength(10);
    expect(deliveryDnaOverviewOffer).toMatchObject({
      offerId: "delivery-dna-overview-gbp-21",
      offerVersion: "2.1.0",
      unitAmountMinor: 29500,
      vatAmountMinor: 0,
      customerTotalMinor: 29500,
      accessVersion: "2.1.0",
    });
  });

  it("keeps Saved Snapshot free and grants only after a verified scoped payment", () => {
    expect(
      savedSnapshotFixtureProjection({
        snapshotStatus: "linked",
        authenticated: true,
        overviewAccess: false,
      }),
    ).toMatchObject({ remainingAssessmentAccessible: false, overviewProjectionAvailable: false });
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: true,
        paymentStatus: "paid",
        amountMinor: 29500,
        currency: "GBP",
        tenantWorkspaceAssessmentMatch: true,
      }),
    ).toMatchObject({
      accessGrantCount: 1,
      accessVersion: "2.1.0",
      remainingAssessmentAccessible: true,
      remainingQuestionsAccessible: 30,
      deliveryDnaActionAccessible: false,
    });
    expect(
      evaluateOverviewPaymentFixture({
        paymentEventVerified: false,
        successRedirectReceived: true,
      }),
    ).toMatchObject({ accessGrantCount: 0, safeStatus: "payment_confirmation_pending" });
  });
});
