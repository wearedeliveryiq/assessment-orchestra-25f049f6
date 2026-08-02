import { describe, expect, it } from "vitest";

import { configuredQuestionIds, evaluateAnalysisEligibility } from "@/lib/analysis/eligibility";

const base = {
  assessmentId: "11111111-1111-4111-8111-111111111111",
  assessmentRevision: 1,
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  expectedOrganisationId: "22222222-2222-4222-8222-222222222222",
  expectedWorkspaceId: "33333333-3333-4333-8333-333333333333",
  completed: true,
  assessmentType: "delivery-dna",
  packId: "delivery-dna",
  packVersion: "1.0.0",
  questionSetId: "delivery-dna",
  questionSetVersion: "1.0.0",
  questionIds: [...configuredQuestionIds],
  configurationSetId: "sprint03-product-config-1.0.0",
};

describe("PDR-003-002 deterministic eligibility", () => {
  it("accepts only the locked 39-question Delivery DNA identity", async () => {
    const result = await evaluateAnalysisEligibility(base);
    expect(configuredQuestionIds).toHaveLength(39);
    expect(result).toMatchObject({ status: "eligible", primaryReason: null, reasons: [] });
  });

  it.each([
    ["assessmentType", "delivery-maturity", "ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE"],
    ["packId", "executive-sponsorship", "ANALYSIS_PACK_ID_INELIGIBLE"],
    ["packVersion", "1.4.0", "ANALYSIS_PACK_VERSION_INELIGIBLE"],
    ["questionSetId", "executive-sponsorship", "ANALYSIS_QUESTION_SET_ID_INELIGIBLE"],
    ["questionSetVersion", "1.4.0", "ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE"],
  ])("rejects a mismatched %s", async (field, value, reason) => {
    const result = await evaluateAnalysisEligibility({ ...base, [field]: value });
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toContain(reason);
  });

  it.each([
    ["missing", configuredQuestionIds.slice(1)],
    ["extra", [...configuredQuestionIds, "ddna.fake.question"]],
    ["duplicate", [...configuredQuestionIds.slice(0, -1), configuredQuestionIds[0]]],
    ["alias", configuredQuestionIds.map((id, index) => (index ? id : id.toUpperCase()))],
  ])("rejects a %s manifest", async (_case, questionIds) => {
    await expect(evaluateAnalysisEligibility({ ...base, questionIds })).resolves.toMatchObject({
      status: "ineligible",
      primaryReason: "ANALYSIS_QUESTION_SET_INCOMPATIBLE",
    });
  });

  it("uses locked reason precedence and order-independent manifest identity", async () => {
    const incompatible = await evaluateAnalysisEligibility({
      ...base,
      expectedOrganisationId: crypto.randomUUID(),
      assessmentType: "delivery-maturity",
      packId: "executive-sponsorship",
      packVersion: "1.4.0",
      questionIds: ["flow.legacy"],
    });
    expect(incompatible.primaryReason).toBe("ANALYSIS_ELIGIBILITY_TENANT_MISMATCH");
    const reversed = await evaluateAnalysisEligibility({
      ...base,
      questionIds: [...base.questionIds].reverse(),
    });
    const ordered = await evaluateAnalysisEligibility(base);
    expect(reversed.assessmentManifestDigest).toBe(ordered.assessmentManifestDigest);
    expect(reversed.status).toBe("eligible");
  });
});
