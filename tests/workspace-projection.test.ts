import { describe, expect, it } from "vitest";

import { projectWorkspaceResult } from "@/lib/delivery-intelligence/projection";
import type { StoredIntelligenceResult } from "@/lib/delivery-intelligence/result-repository.server";

const stored = {
  id: "result-1",
  analysisRunId: "run-1",
  resultHash: "a".repeat(64),
  publishedAt: "2026-08-02T00:00:00Z",
  organisationId: "org-1",
  workspaceId: "workspace-1",
  canonicalResult: {
    analysisRunId: "run-1",
    generatedAt: "2026-08-02T00:00:00Z",
    schemaVersion: "deliveryiq.intelligence-result/1.0.0",
    versions: {
      configurationSetId: "config",
      configurationDigest: "digest",
      configurationVersion: "1",
    },
    scope: {
      organisationId: "org-1",
      workspaceId: "workspace-1",
      assessmentId: "a",
      assessmentRevision: 1,
    },
    capabilities: [
      {
        id: "governance",
        label: "Governance",
        order: 1,
        score: {
          available: true,
          rawScore: 25,
          displayScore: 25,
          band: "developing",
          eligibleWeight: 1,
          eligibleQuestionCount: 3,
          missingQuestionIds: [],
          excludedQuestionIds: [],
          notApplicableQuestionIds: [],
          contextContribution: 0,
          contributions: [
            { questionId: "secret-question", weight: 1, normalised: 25, contribution: 25 },
          ],
        },
        confidenceContribution: 80,
        evidenceIds: ["secret-answer"],
      },
    ],
    overall: {
      available: false,
      rawScore: null,
      displayScore: null,
      band: null,
      availableCapabilityCount: 1,
      reasonCode: "insufficient_capability_coverage",
    },
    confidence: {
      factors: {
        required_completion: 1,
        capability_coverage: 1,
        response_consistency: 1,
        evidence_recency: 1,
        respondent_breadth: 1,
      },
      result: { index: 100, displayIndex: 100, band: "high", limitations: [] },
    },
    findings: { strengths: [], priorityOpportunities: ["governance"], insufficientEvidence: [] },
    patterns: { detected: [], suppressed: [] },
    recommendations: { ranked: [], excluded: [], withheld: [] },
    roadmap: { published: true, day30: [], day60: [], day90: [], unscheduled: [] },
  },
} as unknown as StoredIntelligenceResult;

describe("S3-011 Workspace result projection", () => {
  it("reconciles display values without exposing raw evidence or rule contributions", () => {
    const projection = projectWorkspaceResult(stored);
    expect(projection.capabilities[0]).toMatchObject({
      id: "governance",
      displayScore: 25,
      eligibleAnswerCount: 3,
      totalQuestionCount: 3,
    });
    const serialised = JSON.stringify(projection);
    expect(serialised).not.toContain("secret-answer");
    expect(serialised).not.toContain("secret-question");
    expect(serialised).not.toContain("contributions");
  });
});
