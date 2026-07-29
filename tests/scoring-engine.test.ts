import { describe, expect, it } from "vitest";

import { ScoringEngine } from "@/lib/scores/engine.server";
import { scoreAggregator } from "@/lib/scores/aggregator";
import { scoreCalculator } from "@/lib/scores/calculator";
import { maturityCalculator } from "@/lib/scores/maturity-calculator";
import { scoreValidator } from "@/lib/scores/validator";
import type { Pattern } from "@/lib/patterns/types";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";

const bands = [
  { name: "Optimised", min: 80, max: 100, severity: "info" as const },
  { name: "Developing", min: 50, max: 79.99, severity: "medium" as const },
  { name: "Critical", min: 0, max: 49.99, severity: "critical" as const },
];

function pack(overrides: Partial<KnowledgePackDocument["scoring"]> = {}) {
  return {
    manifest: { id: "test-pack", version: "1.0.0" },
    questions: { questions: [] },
    patterns: { definitions: [{ patternCode: "PAT-001" }, { patternCode: "PAT-002" }] },
    scoring: {
      defaults: {
        severityMultipliers: { critical: 1, high: 0.8, medium: 0.5, low: 0.3, info: 0.2 },
        maturityBands: bands,
      },
      dimensions: [
        {
          scoreCode: "SCR-001",
          dimension: "Executive Sponsorship",
          description: "d",
          weight: 2,
          maximumScore: 100,
          baseScore: 100,
          direction: "deduct" as const,
          patterns: ["PAT-001"],
          patternImpacts: { "PAT-001": 40 },
          defaultImpact: 0,
          expectedEvidence: 1,
        },
        {
          scoreCode: "SCR-002",
          dimension: "Governance",
          description: "d",
          weight: 1,
          maximumScore: 100,
          baseScore: 100,
          direction: "deduct" as const,
          patterns: ["PAT-002"],
          patternImpacts: { "PAT-002": 20 },
          defaultImpact: 0,
          expectedEvidence: 1,
        },
      ],
      overall: {
        scoreCode: "SCR-OVERALL",
        dimension: "Overall",
        maximumScore: 100,
        weightingModel: "weighted-average" as const,
      },
      ...overrides,
    },
  } as unknown as KnowledgePackDocument;
}

function pattern(code: string, confidence = 1): Pattern {
  return {
    id: `id-${code}`,
    sessionId: "s1",
    knowledgePack: "test-pack",
    knowledgePackVersion: "1.0.0",
    patternCode: code,
    name: code,
    category: "leadership",
    description: "",
    businessImpact: "",
    confidence,
    severity: "critical",
    weight: 1,
    supportingRuleIds: [],
    supportingRuleCodes: [],
    patternExpression: "",
    evaluationReason: "",
    createdAt: new Date().toISOString(),
  } as Pattern;
}

const engine = new ScoringEngine(scoreCalculator, scoreAggregator, scoreValidator);
const session = { id: "s1", progress: 100 };

describe("MaturityCalculator", () => {
  it("maps percentages onto the highest matching band", () => {
    expect(maturityCalculator.calculate(90, bands).level).toBe("Optimised");
    expect(maturityCalculator.calculate(55, bands).level).toBe("Developing");
    expect(maturityCalculator.calculate(10, bands).level).toBe("Critical");
  });
});

describe("ScoringEngine", () => {
  it("produces one score per configured dimension", async () => {
    const result = await engine.run({ session, patterns: [], pack: pack() });
    expect(result.scores.map((s) => s.scoreCode)).toEqual(["SCR-001", "SCR-002"]);
  });

  it("is deterministic for identical inputs", async () => {
    const input = { session, patterns: [pattern("PAT-001")], pack: pack() };
    const a = await engine.run(input);
    const b = await engine.run(input);
    expect(a.scores.map((s) => s.percentage)).toEqual(b.scores.map((s) => s.percentage));
  });

  it("deducts pattern impact from the dimension base score", async () => {
    const result = await engine.run({ session, patterns: [pattern("PAT-001")], pack: pack() });
    const score = result.scores.find((s) => s.scoreCode === "SCR-001")!;
    expect(score.percentage).toBeLessThan(100);
    expect(score.supportingPatternCodes).toEqual(["PAT-001"]);
  });

  it("scores a clean assessment at full marks", async () => {
    const result = await engine.run({ session, patterns: [], pack: pack() });
    expect(result.summary.percentage).toBe(100);
    expect(result.summary.maturityLevel).toBe("Optimised");
  });

  it("weights dimensions when aggregating the overall score", async () => {
    const result = await engine.run({ session, patterns: [pattern("PAT-002")], pack: pack() });
    // SCR-002 (weight 1) is penalised; SCR-001 (weight 2) is untouched.
    expect(result.summary.percentage).toBeGreaterThan(
      result.scores.find((s) => s.scoreCode === "SCR-002")!.percentage,
    );
  });

  it("keeps scores and confidence within bounds", async () => {
    const result = await engine.run({
      session,
      patterns: [pattern("PAT-001"), pattern("PAT-002")],
      pack: pack(),
    });
    for (const score of result.scores) {
      expect(score.percentage).toBeGreaterThanOrEqual(0);
      expect(score.percentage).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("retains a per-pattern breakdown for explainability", async () => {
    const result = await engine.run({ session, patterns: [pattern("PAT-001")], pack: pack() });
    const score = result.scores.find((s) => s.scoreCode === "SCR-001")!;
    expect(score.breakdown.contributions[0].patternCode).toBe("PAT-001");
    expect(score.scoreExpression).toBeTruthy();
    expect(score.calculationReason).toBeTruthy();
  });

  it("ignores patterns that no dimension declares", async () => {
    const result = await engine.run({ session, patterns: [pattern("PAT-999")], pack: pack() });
    expect(result.scores.every((s) => s.supportingPatternCodes.length === 0)).toBe(true);
    expect(result.summary.percentage).toBe(100);
  });

  it("scores 500 patterns in under two seconds", async () => {
    const many = Array.from({ length: 500 }, (_, index) => pattern(`PAT-${index}`));
    many[0] = pattern("PAT-001");
    const started = Date.now();
    const result = await engine.run({ session, patterns: many, pack: pack() });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.runSummary.patternsConsidered).toBe(500);
  });
});

describe("ScoreValidator", () => {
  it("rejects duplicate score codes", () => {
    const document = pack();
    document.scoring.dimensions.push({ ...document.scoring.dimensions[0] });
    const { issues } = scoreValidator.validate(document);
    expect(issues.length).toBeGreaterThan(0);
  });
});
