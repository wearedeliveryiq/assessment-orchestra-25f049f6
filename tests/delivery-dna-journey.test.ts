import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateAnalysisEligibility } from "@/lib/analysis/eligibility";
import { normaliseAnalysisInput } from "@/lib/analysis/normalizer";
import { loadAnalysisQuestionSet } from "@/lib/analysis/question-set.server";
import type { AssessmentResponse, AssessmentSession } from "@/lib/assessment/types";
import { analyseCanonicalInput } from "@/lib/delivery-intelligence/engine";
import { sprint03Configuration } from "@/lib/delivery-intelligence/config";
import {
  DELIVERY_DNA_NOT_APPLICABLE_REASON,
  assertDeliveryDnaManifestDigest,
  deliveryDnaCatalogue,
  deliveryDnaManifestDigest,
  deliveryDnaQuestionManifest,
  deliveryDnaSessionMetadata,
} from "@/lib/delivery-dna/catalogue";
import {
  normaliseCustomerAnswerV1 as normaliseCustomerAnswer,
  prepareDeliveryDnaCompletionV1 as prepareDeliveryDnaCompletion,
} from "@/lib/delivery-dna/submission-v1";

async function completedSession(): Promise<AssessmentSession> {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organisationId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    createdByUserId: "44444444-4444-4444-8444-444444444444",
    organisationName: "Delivery DNA Design Partner",
    contactName: null,
    assessmentType: "delivery-dna",
    status: "completed",
    currentSection: "review",
    progress: 100,
    metadata: deliveryDnaSessionMetadata(await deliveryDnaManifestDigest()),
    failureReason: null,
    submittedAt: "2026-08-03T09:00:00.000Z",
    completedAt: "2026-08-03T09:10:00.000Z",
    createdAt: "2026-08-03T08:55:00.000Z",
    updatedAt: "2026-08-03T09:10:00.000Z",
    assessmentRevision: 1,
    consentBasis: "authenticated_assessment_submission",
  };
}

function answeredResponses(value = 3): AssessmentResponse[] {
  return deliveryDnaCatalogue.capabilities.flatMap((capability) =>
    capability.questions.map((question) => ({
      questionId: question.id,
      sectionId: capability.id,
      value,
      score: value,
      notes: null,
      answeredAt: "2026-08-03T09:09:00.000Z",
      evidenceStatus: "answered" as const,
      exclusionReason: null,
      evidenceReasonCode: null,
      evidenceReasonText: null,
      respondentGroupId: "leadership",
      evidenceAt: "2026-08-03T09:09:00.000Z",
    })),
  );
}

describe("PDR-003-003 Delivery DNA collection journey", () => {
  it("matches the locked DIQ-203A capability and 39-question contract exactly", () => {
    const fromCatalogue = deliveryDnaCatalogue.capabilities.map((capability) => ({
      id: capability.id,
      label: capability.label,
      order: capability.order,
      weight: capability.weight,
      questions: capability.questions.map(({ id, weight, required }) => ({ id, weight, required })),
    }));
    const fromConfiguration = sprint03Configuration.capabilities.map((capability) => ({
      id: capability.id,
      label: capability.label,
      order: capability.order,
      weight: capability.weight,
      questions: capability.questions.map(({ id, weight, required }) => ({ id, weight, required })),
    }));
    expect(fromCatalogue).toEqual(fromConfiguration);
    expect(deliveryDnaQuestionManifest).toHaveLength(39);
    expect(new Set(deliveryDnaQuestionManifest).size).toBe(39);
  });

  it("accepts all five locked values and rejects customer-selected excluded evidence", () => {
    const questionId = deliveryDnaQuestionManifest[0];
    for (let value = 1; value <= 5; value += 1) {
      expect(normaliseCustomerAnswer({ questionId, value })).toMatchObject({
        evidenceStatus: "answered",
        value,
      });
    }
    expect(() => normaliseCustomerAnswer({ questionId, value: 0 })).toThrow(
      "DELIVERY_DNA_ANSWER_INVALID",
    );
    expect(
      deliveryDnaCatalogue.journey.evidenceStatusPresentation.excluded.customerSelectable,
    ).toBe(false);
  });

  it("requires a concise reason for not-applicable evidence", () => {
    const questionId = deliveryDnaQuestionManifest[0];
    expect(() =>
      normaliseCustomerAnswer({ questionId, value: null, evidenceStatus: "not_applicable" }),
    ).toThrow("DELIVERY_DNA_NOT_APPLICABLE_REASON_REQUIRED");
    expect(
      normaliseCustomerAnswer({
        questionId,
        value: null,
        evidenceStatus: "not_applicable",
        evidenceReasonText: "No portfolio layer exists in the current operating model.",
      }),
    ).toMatchObject({
      evidenceStatus: "not_applicable",
      evidenceReasonCode: DELIVERY_DNA_NOT_APPLICABLE_REASON,
      value: null,
    });
  });

  it("canonicalises unanswered manifest entries as missing only after acknowledgement", async () => {
    const session = await completedSession();
    const recorded = answeredResponses().slice(0, 35);
    expect(() =>
      prepareDeliveryDnaCompletion(session, recorded, {
        reviewAcknowledged: true,
        missingAcknowledged: false,
      }),
    ).toThrow("DELIVERY_DNA_MISSING_ACKNOWLEDGEMENT_REQUIRED");
    const completion = prepareDeliveryDnaCompletion(session, recorded, {
      reviewAcknowledged: true,
      missingAcknowledged: true,
    });
    expect(completion.missingResponses).toHaveLength(4);
    expect(completion.missingResponses.every((item) => item.evidenceStatus === "missing")).toBe(
      true,
    );
    expect(
      [
        ...recorded.map((item) => item.questionId),
        ...completion.missingResponses.map((item) => item.questionId),
      ].sort(),
    ).toEqual(deliveryDnaQuestionManifest);
  });

  it("pins the stored manifest digest to the exact locked 39-question identity", async () => {
    const session = await completedSession();
    const identity = prepareDeliveryDnaCompletion(session, answeredResponses(), {
      reviewAcknowledged: true,
    }).identity;
    expect(identity.questionManifestDigest).toBe(await deliveryDnaManifestDigest());
    expect(identity.questionManifest).toEqual(deliveryDnaQuestionManifest);
    await expect(assertDeliveryDnaManifestDigest("0".repeat(64))).rejects.toThrow(
      "DELIVERY_DNA_IDENTITY_INVALID",
    );
  });

  it("preserves an authorised exclusion without exposing it as a customer answer", async () => {
    const session = await completedSession();
    const responses = answeredResponses();
    responses[0] = {
      ...responses[0],
      value: null,
      score: null,
      evidenceStatus: "excluded",
      exclusionReason: "quality_review",
    };
    expect(
      prepareDeliveryDnaCompletion(session, responses, {
        reviewAcknowledged: true,
        missingAcknowledged: false,
      }),
    ).toMatchObject({ missingCount: 0, missingResponses: [] });
  });

  it("reaches deterministic eligibility and the analysis core with the genuine manifest", async () => {
    const session = await completedSession();
    const responses = answeredResponses();
    const eligibility = await evaluateAnalysisEligibility({
      assessmentId: session.id,
      assessmentRevision: 1,
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
      expectedOrganisationId: session.organisationId,
      expectedWorkspaceId: session.workspaceId,
      completed: true,
      assessmentType: session.assessmentType,
      packId: "delivery-dna",
      packVersion: "1.0.0",
      questionSetId: "delivery-dna",
      questionSetVersion: "1.0.0",
      questionIds: responses.map((response) => response.questionId),
      configurationSetId: "sprint03-product-config-1.0.0",
    });
    expect(eligibility).toMatchObject({ status: "eligible", reasons: [] });

    const canonical = normaliseAnalysisInput({
      session,
      responses,
      pack: loadAnalysisQuestionSet("delivery-dna", "1.0.0"),
      requestedMode: "workspace",
    });
    expect(canonical.responses).toHaveLength(39);
    expect(analyseCanonicalInput(canonical).overall).toMatchObject({ available: true });
  });

  it("ships double-submit protection, immutable provenance and client grant hardening", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260803060000_delivery_dna_collection_journey.sql",
      ),
      "utf8",
    );
    const hardening = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260803061000_harden_delivery_dna_collection_permissions.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("runtime_executions_delivery_dna_collection_once");
    expect(migration).toContain("Completed Delivery DNA collection provenance is immutable");
    expect(hardening).toContain("FROM PUBLIC, anon, authenticated");
  });
});
