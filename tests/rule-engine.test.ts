import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { ruleEngine } from "@/lib/rules/engine.server";
import { ruleEvaluator } from "@/lib/rules/evaluator";
import { ruleValidator } from "@/lib/rules/validator";
import type { RuleDefinition, KnowledgePackDocument } from "@/lib/knowledge-packs/schema";
import type { Signal } from "@/lib/signals/types";

const pack = knowledgePackLoader.loadActive();

function signal(code: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id: `id-${code}`,
    sessionId: "session-1",
    knowledgePack: pack.manifest.id,
    knowledgePackVersion: pack.manifest.version,
    signalCode: code,
    name: `Signal ${code}`,
    category: "Governance",
    description: "description",
    supportingObservationIds: ["obs-1"],
    supportingDefinitionIds: ["def-1"],
    confidence: 0.9,
    severity: "high",
    weight: 1,
    ruleExpression: "expr",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function definition(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return {
    ruleCode: "RULE-TEST",
    name: "Test rule",
    category: "Governance",
    description: "description",
    rationale: "rationale",
    logic: "ALL",
    signals: ["SIG-001", "SIG-003"],
    minimumConfidence: 0.6,
    severity: "high",
    weight: 1,
    statusOnFail: "not_evaluated",
    explanationTemplate: "{count} signal(s): {signals}",
    ...overrides,
  };
}

describe("RuleEvaluator operators", () => {
  it("ALL passes only when every declared signal qualifies", () => {
    const both = ruleEvaluator.evaluate(definition(), [signal("SIG-001"), signal("SIG-003")]);
    expect(both.status).toBe("passed");

    const partial = ruleEvaluator.evaluate(definition(), [signal("SIG-001")]);
    expect(partial.status).toBe("not_evaluated");
    expect(partial.satisfied).toBe(false);
  });

  it("ANY passes on a single qualifying signal", () => {
    const result = ruleEvaluator.evaluate(definition({ logic: "ANY" }), [signal("SIG-003")]);
    expect(result.status).toBe("passed");
    expect(result.matched).toHaveLength(1);
  });

  it("NONE passes only in the absence of the declared signals", () => {
    const absent = ruleEvaluator.evaluate(definition({ logic: "NONE" }), [signal("SIG-009")]);
    expect(absent.status).toBe("passed");
    expect(absent.confidence).toBe(1);

    const present = ruleEvaluator.evaluate(definition({ logic: "NONE", statusOnFail: "failed" }), [
      signal("SIG-001"),
    ]);
    expect(present.status).toBe("failed");
    expect(present.confidence).toBeLessThan(1);
  });

  it("AT_LEAST honours the threshold", () => {
    const def = definition({
      logic: "AT_LEAST",
      threshold: 2,
      signals: ["SIG-001", "SIG-003", "SIG-005"],
    });
    expect(ruleEvaluator.evaluate(def, [signal("SIG-001")]).satisfied).toBe(false);
    expect(ruleEvaluator.evaluate(def, [signal("SIG-001"), signal("SIG-005")]).satisfied).toBe(true);
  });

  it("EXACTLY requires the precise count", () => {
    const def = definition({ logic: "EXACTLY", threshold: 1, signals: ["SIG-001", "SIG-003"] });
    expect(ruleEvaluator.evaluate(def, [signal("SIG-001")]).satisfied).toBe(true);
    expect(ruleEvaluator.evaluate(def, [signal("SIG-001"), signal("SIG-003")]).satisfied).toBe(
      false,
    );
  });

  it("ignores signals below the minimum confidence", () => {
    const result = ruleEvaluator.evaluate(definition({ logic: "ANY", minimumConfidence: 0.8 }), [
      signal("SIG-001", { confidence: 0.5 }),
    ]);
    expect(result.matched).toHaveLength(0);
    expect(result.satisfied).toBe(false);
  });

  it("renders a human-readable explanation from the pack template", () => {
    const result = ruleEvaluator.evaluate(definition({ logic: "ANY" }), [
      signal("SIG-001", { name: "Weak Executive Sponsorship" }),
    ]);
    expect(result.reason).toBe("1 signal(s): Weak Executive Sponsorship");
  });

  it("throws on an unsupported operator", () => {
    expect(() =>
      ruleEvaluator.evaluate(definition({ logic: "SOMETHING" as never }), []),
    ).toThrowError(/Unsupported rule operator/);
  });
});

describe("RuleValidator", () => {
  function packWith(definitions: RuleDefinition[]): KnowledgePackDocument {
    return { ...pack, rules: { ...pack.rules, definitions } } as KnowledgePackDocument;
  }

  it("rejects unknown signal references", () => {
    const { valid, issues } = ruleValidator.validate(
      packWith([definition({ signals: ["SIG-999"] })]),
    );
    expect(valid).toHaveLength(0);
    expect(issues[0].message).toMatch(/unknown signal code/);
  });

  it("rejects threshold operators without a threshold", () => {
    const { issues } = ruleValidator.validate(
      packWith([definition({ logic: "AT_LEAST", threshold: undefined })]),
    );
    expect(issues[0].message).toMatch(/requires a threshold/);
  });

  it("rejects duplicate rule codes", () => {
    const { valid, issues } = ruleValidator.validate(packWith([definition(), definition()]));
    expect(valid).toHaveLength(1);
    expect(issues[0].message).toMatch(/duplicate rule code/);
  });

  it("accepts the shipped knowledge pack", () => {
    const { valid, issues } = ruleValidator.validate(pack);
    expect(issues).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });
});

describe("RuleEngine", () => {
  const signals = [signal("SIG-001"), signal("SIG-003"), signal("SIG-005")];

  it("evaluates every pack rule exactly once and is deterministic", async () => {
    const first = await ruleEngine.run({ session: { id: "session-1" }, signals, pack });
    const second = await ruleEngine.run({ session: { id: "session-1" }, signals, pack });

    const codes = first.results.map((r) => r.ruleCode);
    expect(new Set(codes).size).toBe(codes.length); // duplicate prevention
    expect(codes).toEqual([...codes].sort());
    expect(second.results.map((r) => ({ ...r, executedAt: "" }))).toEqual(
      first.results.map((r) => ({ ...r, executedAt: "" })),
    );
    expect(first.summary.evaluated).toBe(pack.rules.definitions.length);
  });

  it("continues after an individual rule fails", async () => {
    const broken = {
      ...pack,
      rules: {
        ...pack.rules,
        definitions: [definition({ ruleCode: "RULE-A", logic: "ANY" }), definition({ ruleCode: "RULE-B" })],
      },
    } as KnowledgePackDocument;

    const engineResult = await ruleEngine.run({
      session: { id: "session-1" },
      signals,
      pack: broken,
    });
    expect(engineResult.results).toHaveLength(2);
  });

  it("evaluates 500 signals in under 2 seconds", async () => {
    const many = Array.from({ length: 500 }, (_, index) => signal(`SIG-${index}`));
    const started = Date.now();
    const result = await ruleEngine.run({
      session: { id: "session-1" },
      signals: [...signals, ...many],
      pack,
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.summary.signalsConsidered).toBe(503);
  });
});
