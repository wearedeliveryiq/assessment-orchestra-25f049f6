import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { patternEngine } from "@/lib/patterns/engine.server";
import { patternEvaluator } from "@/lib/patterns/evaluator";
import { patternValidator } from "@/lib/patterns/validator";
import { patternConfidenceCalculator } from "@/lib/patterns/confidence-calculator";
import type { KnowledgePackDocument, PatternDefinition } from "@/lib/knowledge-packs/schema";
import type { RuleResult } from "@/lib/rules/types";

const pack = knowledgePackLoader.loadActive();

function rule(code: string, overrides: Partial<RuleResult> = {}): RuleResult {
  return {
    id: `id-${code}`,
    sessionId: "session-1",
    knowledgePack: pack.manifest.id,
    knowledgePackVersion: pack.manifest.version,
    ruleCode: code,
    name: `Rule ${code}`,
    description: "description",
    category: "Governance",
    status: "passed",
    confidence: 0.9,
    severity: "high",
    supportingSignalIds: ["sig-1"],
    supportingSignalCodes: ["SIG-001"],
    evaluationReason: "reason",
    ruleExpression: "expr",
    weight: 1,
    executedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function definition(overrides: Partial<PatternDefinition> = {}): PatternDefinition {
  return {
    patternCode: "PAT-TEST",
    name: "Test pattern",
    category: "Governance",
    description: "description",
    businessImpact: "impact statement",
    logic: "ALL",
    requiredRules: ["RULE-001", "RULE-002"],
    minimumConfidence: 0.6,
    statusIn: ["passed"],
    severity: "high",
    weight: 1,
    expectedEvidence: 2,
    explanationTemplate: "{count} rule(s): {rules}",
    ...overrides,
  };
}

describe("PatternEvaluator operators", () => {
  it("ALL matches only when every declared rule qualifies", () => {
    const both = patternEvaluator.evaluate(definition(), [rule("RULE-001"), rule("RULE-002")]);
    expect(both.satisfied).toBe(true);

    const partial = patternEvaluator.evaluate(definition(), [rule("RULE-001")]);
    expect(partial.satisfied).toBe(false);
  });

  it("ANY matches with a single qualifying rule", () => {
    const result = patternEvaluator.evaluate(definition({ logic: "ANY" }), [rule("RULE-002")]);
    expect(result.satisfied).toBe(true);
  });

  it("NONE matches only in the absence of qualifying rules", () => {
    const absent = patternEvaluator.evaluate(definition({ logic: "NONE" }), []);
    expect(absent.satisfied).toBe(true);
    expect(absent.confidence).toBe(1);

    const present = patternEvaluator.evaluate(definition({ logic: "NONE" }), [rule("RULE-001")]);
    expect(present.satisfied).toBe(false);
    expect(present.confidence).toBeCloseTo(0.1, 5);
  });

  it("AT_LEAST and EXACTLY honour their thresholds", () => {
    const rules = [rule("RULE-001"), rule("RULE-002")];

    expect(
      patternEvaluator.evaluate(definition({ logic: "AT_LEAST", threshold: 2 }), rules).satisfied,
    ).toBe(true);
    expect(
      patternEvaluator.evaluate(definition({ logic: "AT_LEAST", threshold: 3 }), rules).satisfied,
    ).toBe(false);
    expect(
      patternEvaluator.evaluate(definition({ logic: "EXACTLY", threshold: 2 }), rules).satisfied,
    ).toBe(true);
    expect(
      patternEvaluator.evaluate(definition({ logic: "EXACTLY", threshold: 1 }), rules).satisfied,
    ).toBe(false);
  });

  it("ignores rules below the confidence floor or with a non-qualifying status", () => {
    const weak = patternEvaluator.evaluate(definition(), [
      rule("RULE-001", { confidence: 0.2 }),
      rule("RULE-002"),
    ]);
    expect(weak.satisfied).toBe(false);

    const wrongStatus = patternEvaluator.evaluate(definition(), [
      rule("RULE-001", { status: "failed" }),
      rule("RULE-002"),
    ]);
    expect(wrongStatus.satisfied).toBe(false);
  });

  it("escalates severity to the strongest supporting rule but never for info patterns", () => {
    const escalated = patternEvaluator.evaluate(definition(), [
      rule("RULE-001", { severity: "critical" }),
      rule("RULE-002"),
    ]);
    expect(escalated.severity).toBe("critical");

    const informational = patternEvaluator.evaluate(definition({ severity: "info" }), [
      rule("RULE-001", { severity: "critical" }),
      rule("RULE-002"),
    ]);
    expect(informational.severity).toBe("info");
  });

  it("throws for an unsupported operator", () => {
    expect(() =>
      patternEvaluator.evaluate(
        definition({ logic: "SOMETHING" as PatternDefinition["logic"] }),
        [],
      ),
    ).toThrow(/Unsupported pattern operator/);
  });
});

describe("PatternConfidenceCalculator", () => {
  it("is not a simple average of the supporting rule confidences", () => {
    const breakdown = patternConfidenceCalculator.calculate({
      evidence: [
        { confidence: 0.6, weight: 1 },
        { confidence: 0.8, weight: 1 },
      ],
      expectedEvidence: 2,
      requiredCount: 2,
      definitionWeight: 1,
    });
    expect(breakdown.confidence).not.toBeCloseTo(0.7, 3);
    expect(breakdown.support).toBe(1);
  });

  it("rewards broader corroboration", () => {
    const evidence = { confidence: 0.7, weight: 1 };
    const few = patternConfidenceCalculator.calculate({
      evidence: [evidence, evidence],
      expectedEvidence: 4,
      requiredCount: 4,
      definitionWeight: 1,
    });
    const many = patternConfidenceCalculator.calculate({
      evidence: [evidence, evidence, evidence, evidence],
      expectedEvidence: 4,
      requiredCount: 4,
      definitionWeight: 1,
    });
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  it("returns zero with no evidence and never exceeds 1", () => {
    expect(
      patternConfidenceCalculator.calculate({
        evidence: [],
        expectedEvidence: 2,
        requiredCount: 2,
        definitionWeight: 1,
      }).confidence,
    ).toBe(0);

    expect(
      patternConfidenceCalculator.calculate({
        evidence: Array.from({ length: 20 }, () => ({ confidence: 1, weight: 2 })),
        expectedEvidence: 1,
        requiredCount: 1,
        definitionWeight: 2,
      }).confidence,
    ).toBeLessThanOrEqual(1);
  });
});

describe("PatternValidator", () => {
  const withDefinitions = (definitions: PatternDefinition[]): KnowledgePackDocument => ({
    ...pack,
    patterns: { ...pack.patterns, definitions },
  });

  it("accepts the shipped knowledge pack definitions", () => {
    const { valid, issues } = patternValidator.validate(pack);
    expect(issues).toEqual([]);
    expect(valid.length).toBe(pack.patterns.definitions.length);
  });

  it("rejects unknown rule references, bad thresholds and duplicate codes", () => {
    const { valid, issues } = patternValidator.validate(
      withDefinitions([
        definition({ requiredRules: ["RULE-999"] }),
        definition({ patternCode: "PAT-A", logic: "AT_LEAST" }),
        definition({ patternCode: "PAT-B", logic: "AT_LEAST", threshold: 9 }),
        definition({ patternCode: "PAT-DUP" }),
        definition({ patternCode: "PAT-DUP" }),
      ]),
    );

    expect(valid.map((d) => d.patternCode)).toEqual(["PAT-DUP"]);
    expect(issues[0].message).toContain("unknown rule code");
    expect(issues[1].message).toContain("requires a threshold");
    expect(issues[2].message).toContain("exceeds");
    expect(issues[3].message).toContain("duplicate pattern code");
  });
});

describe("PatternEngine", () => {
  const session = { id: "session-1" };
  const now = () => "2026-01-01T00:00:00.000Z";

  const allRules = pack.rules.definitions.map((d) => rule(d.ruleCode));

  it("generates patterns carrying business impact and full rule provenance", async () => {
    const { patterns, summary } = await patternEngine.run({
      session,
      rules: allRules,
      pack,
      now,
    });

    expect(patterns.length).toBeGreaterThan(0);
    expect(summary.rulesConsidered).toBe(allRules.length);
    for (const pattern of patterns) {
      expect(pattern.businessImpact.length).toBeGreaterThan(0);
      expect(pattern.knowledgePackVersion).toBe(pack.manifest.version);
      expect(pattern.supportingRuleCodes.length).toBeGreaterThan(0);
      expect(pattern.confidence).toBeGreaterThan(0);
    }
  });

  it("maps business impact from the knowledge pack definition", async () => {
    const { patterns } = await patternEngine.run({ session, rules: allRules, pack, now });
    for (const pattern of patterns) {
      const source = pack.patterns.definitions.find(
        (d) => d.patternCode === pattern.patternCode,
      );
      expect(pattern.businessImpact).toBe(source?.businessImpact);
    }
  });

  it("never emits duplicate patterns", async () => {
    const duplicated: KnowledgePackDocument = {
      ...pack,
      patterns: {
        ...pack.patterns,
        definitions: [...pack.patterns.definitions, ...pack.patterns.definitions],
      },
    };
    const { patterns } = await patternEngine.run({ session, rules: allRules, pack: duplicated, now });
    expect(new Set(patterns.map((p) => p.patternCode)).size).toBe(patterns.length);
  });

  it("skips invalid definitions and keeps processing the rest", async () => {
    const broken: KnowledgePackDocument = {
      ...pack,
      patterns: {
        ...pack.patterns,
        definitions: [
          definition({ patternCode: "PAT-BROKEN", requiredRules: ["RULE-999"] }),
          ...pack.patterns.definitions,
        ],
      },
    };
    const { patterns, summary } = await patternEngine.run({
      session,
      rules: allRules,
      pack: broken,
      now,
    });
    expect(summary.invalid.some((i) => i.patternCode === "PAT-BROKEN")).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("is deterministic across repeated runs", async () => {
    const first = await patternEngine.run({ session, rules: allRules, pack, now });
    const second = await patternEngine.run({ session, rules: allRules, pack, now });
    expect(second.patterns).toEqual(first.patterns);
  });

  it("evaluates 500 rule results in under 2 seconds", async () => {
    const many: RuleResult[] = Array.from({ length: 500 }, (_, index) =>
      rule(pack.rules.definitions[index % pack.rules.definitions.length].ruleCode, {
        id: `bulk-${index}`,
      }),
    );

    const started = Date.now();
    const { summary } = await patternEngine.run({ session, rules: many, pack, now });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(summary.durationMs).toBeLessThan(2000);
  });
});
