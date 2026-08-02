import { describe, expect, it } from "vitest";

import { projectPublicResult } from "@/lib/delivery-intelligence/disclosure";

const workspace = {
  schemaVersion: "deliveryiq.workspace-result/1.0.0",
  publicResultId: "public-1",
  generatedAt: "2026-08-02T00:00:00Z",
  overall: { rawScore: 49.123456, displayScore: 49.1, band: "developing", ruleVersion: "secret" },
  confidence: { index: 80, band: "high", caveat: null, factors: { breadth: 1 } },
  summary: "Approved summary",
  strengths: [{ title: "Governance", summary: "Approved strength", evidenceIds: ["secret-e"] }],
  opportunities: [{ title: "Risk", summary: "Approved opportunity", traceId: "secret-trace" }],
  recommendationPreviews: [
    { title: "Act", impact: "high", summary: "Approved action", rule: "secret-rule" },
  ],
  registrationPrompt: { label: "Register", destination: "/register", internalCampaign: "secret" },
  recommendations: [{ successMeasures: ["restricted"] }],
  roadmap: { day30: ["restricted"] },
  teamMates: [{ id: "restricted" }],
  rawEvidence: [{ answer: 5 }],
  configurationSnapshot: { rules: "restricted" },
};

describe("S3-014 deny-by-default disclosure", () => {
  it("returns only the exact approved nested schema", () => {
    expect(projectPublicResult(workspace)).toEqual({
      schemaVersion: workspace.schemaVersion,
      resultId: "public-1",
      generatedAt: workspace.generatedAt,
      overall: { displayScore: 49.1, band: "developing" },
      confidence: { band: "high", caveat: null },
      summary: "Approved summary",
      strengths: [{ title: "Governance", summary: "Approved strength" }],
      opportunities: [{ title: "Risk", summary: "Approved opportunity" }],
      recommendationPreviews: [{ title: "Act", impact: "high", summary: "Approved action" }],
      registrationPrompt: { label: "Register", destination: "/register" },
    });
  });

  it("cannot leak Workspace-only fields through over-fetch input", () => {
    const serialised = JSON.stringify(projectPublicResult(workspace));
    for (const restricted of [
      "secret",
      "rawEvidence",
      "teamMates",
      "roadmap",
      "successMeasures",
      "configurationSnapshot",
      "evidenceIds",
      "traceId",
    ]) {
      expect(serialised).not.toContain(restricted);
    }
  });
});
