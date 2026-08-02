import { describe, expect, it } from "vitest";

import {
  calculateConfidence,
  confidenceBand,
  type ConfidenceFactors,
} from "@/lib/delivery-intelligence/confidence";
import { projectPublicResult } from "@/lib/delivery-intelligence/disclosure";
import { classifyFindings, type FindingCapability } from "@/lib/delivery-intelligence/findings";
import { mapKnowledgePacks, mapTeamMates } from "@/lib/delivery-intelligence/mappings";
import { evaluateLifecycleFixture } from "@/lib/delivery-intelligence/lifecycle";
import { renderLowConfidenceNarrative } from "@/lib/delivery-intelligence/narrative";
import {
  detectPatterns,
  resolvePatternConflict,
  type PatternInput,
} from "@/lib/delivery-intelligence/patterns";
import {
  deduplicateRecommendations,
  resolveRecommendationEligibility,
  sortRecommendations,
  type RankedRecommendation,
  type RecommendationInput,
} from "@/lib/delivery-intelligence/recommendations";
import { buildRoadmap, type RoadmapInput } from "@/lib/delivery-intelligence/roadmap";
import {
  calculateCapabilityScore,
  calculateOverallScore,
  scoreBand,
  type ScoreResponse,
} from "@/lib/delivery-intelligence/scoring";
import {
  validateFixtureTrace,
  type TraceFixtureInput,
} from "@/lib/delivery-intelligence/traceability";
import golden from "./fixtures/sprint03-golden-1.0.0.json";

type JsonRecord = Record<string, unknown>;
type Fixture = (typeof golden.fixtures)[number];
const record = (value: unknown) => value as JsonRecord;

function projection(value: unknown, paths: string[]): JsonRecord {
  const result: JsonRecord = {};
  for (const path of paths) {
    const segments = path.split(".");
    let source: unknown = value;
    for (const segment of segments) source = record(source)[segment];
    let target = result;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) target[segment] = source;
      else target = (target[segment] ??= {}) as JsonRecord;
    });
  }
  return result;
}

function evaluate(fixture: Fixture): unknown {
  const input = record(fixture.input);
  switch (fixture.stage) {
    case "capability_scoring":
      return calculateCapabilityScore(
        input.questionWeights as Record<string, number>,
        input.responses as Record<string, ScoreResponse>,
      );
    case "banding":
      return { band: scoreBand(input.rawScore as number) };
    case "overall_scoring":
      return calculateOverallScore(input.capabilityScores as number[]);
    case "confidence": {
      if (input.factors) return calculateConfidence(input.factors as ConfidenceFactors);
      const resultA = calculateConfidence(record(input.resultA).factors as ConfidenceFactors);
      const resultB = calculateConfidence(record(input.resultB).factors as ConfidenceFactors);
      return { resultA, resultB, equal: resultA.index === resultB.index };
    }
    case "confidence_banding":
      return { band: confidenceBand(input.index as number) };
    case "findings": {
      const findings = classifyFindings(input.capabilities as FindingCapability[]);
      return {
        strengths: findings.strengths.map((item) => item.id),
        priorityOpportunities: findings.priorityOpportunities.map((item) => item.id),
        insufficientEvidence: findings.insufficientEvidence.map((item) => item.id),
      };
    }
    case "patterns":
      return {
        detected: detectPatterns(input as unknown as PatternInput).detected.map((item) => item.id),
      };
    case "pattern_conflict":
      return resolvePatternConflict(
        input.matched as Array<{ id: string; group: string; priority: number; order: number }>,
      );
    case "recommendations": {
      const resolved = resolveRecommendationEligibility(input as unknown as RecommendationInput);
      return {
        eligible: resolved.eligible.map((item) => item.id),
        excluded: resolved.excluded,
        withheld: resolved.withheld,
        dependencyReadiness: resolved.dependencyReadiness,
      };
    }
    case "recommendation_sort":
      return {
        orderedIds: sortRecommendations(input.recommendations as RankedRecommendation[]).map(
          (item) => item.id,
        ),
      };
    case "recommendation_deduplication":
      return {
        recommendations: deduplicateRecommendations(
          input.candidates as Array<{
            id: string;
            dedupeGroup: string;
            order: number;
            triggers: string[];
          }>,
        ),
      };
    case "roadmap": {
      const result = buildRoadmap(input as unknown as RoadmapInput);
      if ("error" in result) return result;
      const expected = record(fixture.expected);
      const itemShape = Array.isArray(expected.day30) && typeof expected.day30[0] === "string";
      return itemShape
        ? {
            ...result,
            day30: result.day30.map((item) => item.id),
            day60: result.day60.map((item) => item.id),
            day90: result.day90.map((item) => item.id),
          }
        : result;
    }
    case "knowledge_packs":
      return {
        recommendations: mapKnowledgePacks(
          input.recommendationRanks as Record<string, number>,
          input.catalogue as Record<string, { status: string; entitled: boolean }>,
        ),
      };
    case "teammates":
      return { recommendations: mapTeamMates(input as Parameters<typeof mapTeamMates>[0]) };
    case "narrative":
      return renderLowConfidenceNarrative(input.confidenceLimitationSummary as string);
    case "traceability":
      return validateFixtureTrace(input as unknown as TraceFixtureInput);
    case "disclosure":
      return { public: projectPublicResult(input.workspace) };
    case "analysis_lifecycle":
      return evaluateLifecycleFixture(input as { sameCanonicalInput: boolean });
    default:
      throw new Error(`Golden fixture stage not implemented: ${fixture.stage}`);
  }
}

describe("DIQ-203B locked Sprint 03 golden baseline", () => {
  it("contains the approved 52 fixtures", () => {
    expect(golden.document).toMatchObject({
      id: "DIQ-203B",
      version: "1.0.0",
      status: "locked",
      configurationSetId: "sprint03-product-config-1.0.0",
      approvedBy: "Matt Prust",
    });
    expect(golden.fixtures).toHaveLength(52);
  });

  for (const fixture of golden.fixtures) {
    it(`${fixture.id} [${fixture.stage}]`, () => {
      expect(projection(evaluate(fixture), fixture.assertionProjection)).toEqual(fixture.expected);
    });
  }
});
