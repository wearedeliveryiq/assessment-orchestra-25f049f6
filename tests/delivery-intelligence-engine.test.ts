import { describe, expect, it } from "vitest";

import type { CanonicalAnalysisInput } from "@/lib/analysis/types";
import { sprint03Configuration } from "@/lib/delivery-intelligence/config";
import { analyseCanonicalInput } from "@/lib/delivery-intelligence/engine";

function canonical(values: Record<string, number> = {}): CanonicalAnalysisInput {
  return {
    schemaVersion: "deliveryiq.analysis-input/2.0.0",
    engineVersion: "deliveryiq.intelligence-engine/1.0.0",
    assessment: {
      sessionId: "assessment-1",
      assessmentType: "delivery-dna",
      revision: 1,
      organisationId: "tenant-1",
      workspaceId: "workspace-1",
      completedAt: "2026-08-02T00:00:00.000Z",
      consentBasis: "test",
    },
    knowledgePack: { id: "delivery-dna", version: "1.0.0", questionSetVersion: "1.0.0" },
    requestedMode: "workspace",
    responses: sprint03Configuration.capabilities.flatMap((capability) =>
      capability.questions.map((question) => ({
        answerId: `answer:${question.id}`,
        answerVersion: "1",
        questionId: question.id,
        questionVersion: "1.0.0",
        sectionId: capability.id,
        value: values[question.id] ?? 4,
        status: "answered" as const,
        exclusionReason: null,
        respondentGroupId: "delivery",
        evidenceAt: "2026-08-01T00:00:00.000Z",
      })),
    ),
  };
}

describe("shared Delivery Intelligence Engine", () => {
  it("calculates the complete approved capability, overall and confidence model", () => {
    const result = analyseCanonicalInput(canonical());
    expect(result.capabilities).toHaveLength(13);
    expect(result.capabilities.every((capability) => capability.score.rawScore === 75)).toBe(true);
    expect(result.overall).toMatchObject({ available: true, rawScore: 75, band: "leading" });
    expect(result.confidence.result).toMatchObject({ index: 94, band: "high" });
  });

  it("is invariant to canonical evidence ordering", () => {
    const input = canonical();
    const reordered = { ...input, responses: [...input.responses].reverse() };
    expect(analyseCanonicalInput(reordered)).toEqual(analyseCanonicalInput(input));
  });

  it("fails closed for questions outside the approved Delivery DNA taxonomy", () => {
    const input = canonical();
    input.responses.push({ ...input.responses[0], answerId: "unknown", questionId: "unknown" });
    expect(() => analyseCanonicalInput(input)).toThrow("ANALYSIS_INPUT_INVALID");
  });
});
