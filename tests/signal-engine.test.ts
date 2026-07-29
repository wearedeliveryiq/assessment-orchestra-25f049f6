import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { signalEngine } from "@/lib/signals/engine.server";
import { signalEvaluator } from "@/lib/signals/evaluator";
import { signalValidator } from "@/lib/signals/validator";
import { signalConfidenceCalculator } from "@/lib/signals/confidence-calculator";
import type { Observation } from "@/lib/observations/types";
import type { SignalDefinition } from "@/lib/knowledge-packs/schema";

const pack = knowledgePackLoader.loadActive();

function observation(overrides: Partial<Observation> & { definitionId: string }): Observation {
  return {
    id: `id-${overrides.definitionId}`,
    sessionId: "session-1",
    knowledgePack: pack.manifest.id,
    knowledgePackVersion: pack.manifest.version,
    definitionId: overrides.definitionId,
    questionId: "q1",
    category: "Governance",
    title: "title",
    description: "description",
    evidence: "evidence",
    severity: "high",
    confidence: 0.9,
    weight: 1,
    sourceValue: 1,
    sourceLabel: "Rarely",
    ruleExpression: "expr",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function definition(overrides: Partial<SignalDefinition> = {}): SignalDefinition {
  return {
    code: "SIG-TEST",
    name: "Test signal",
    category: "Governance",
    description: "description",
    rationale: "rationale",
    match: { observationIds: ["obs.a", "obs.b"], minMatches: 2 },
    severity: "high",
    weight: 1,
    minConfidence: 0.5,
    expectedEvidence: 2,
    escalateWithEvidence: false,
    ...overrides,
  } as SignalDefinition;
}

describe("SignalConfidenceCalculator", () => {
  it("is not a naive average and rewards corroboration", () => {
    const single = signalConfidenceCalculator.calculate({
      evidence: [{ confidence: 0.8, weight: 1 }],
      expectedEvidence: 3,
      definitionWeight: 1,
    });
    const many = signalConfidenceCalculator.calculate({
      evidence: [
        { confidence: 0.8, weight: 1 },
        { confidence: 0.8, weight: 1 },
        { confidence: 0.8, weight: 1 },
      ],
      expectedEvidence: 3,
      definitionWeight: 1,
    });
    expect(many.confidence).toBeGreaterThan(single.confidence);
    expect(many.confidence).not.toBeCloseTo(0.8, 5);
    expect(many.confidence).toBeLessThanOrEqual(1);
    expect(single.confidence).toBeGreaterThanOrEqual(0);
  });

  it("returns zero confidence with no evidence", () => {
    expect(
      signalConfidenceCalculator.calculate({
        evidence: [],
        expectedEvidence: 2,
        definitionWeight: 1,
      }).confidence,
    ).toBe(0);
  });
});

describe("SignalEvaluator", () => {
  it("matches supporting observations and reports why a signal is not met", () => {
    const result = signalEvaluator.evaluate(definition(), [observation({ definitionId: "obs.a" })]);
    expect(result.met).toBe(false);
    expect(result.reason).toContain("1 of 2");
  });

  it("emits the signal when the criteria are satisfied", () => {
    const result = signalEvaluator.evaluate(definition(), [
      observation({ definitionId: "obs.a" }),
      observation({ definitionId: "obs.b" }),
    ]);
    expect(result.met).toBe(true);
    expect(result.matched.map((o) => o.definitionId)).toEqual(["obs.a", "obs.b"]);
    expect(result.expression).toContain("SIG-TEST");
  });

  it("supports regex, severity and category selectors from the pack", () => {
    const matched = signalEvaluator.select(
      definition({
        match: {
          observationIds: [],
          definitionIdMatches: "\\.deficit$",
          severityIn: ["critical"],
          minMatches: 1,
        },
      }),
      [
        observation({ definitionId: "obs.x.deficit", severity: "critical" }),
        observation({ definitionId: "obs.y.deficit", severity: "low" }),
        observation({ definitionId: "obs.z.strength", severity: "critical" }),
      ],
    );
    expect(matched.map((o) => o.definitionId)).toEqual(["obs.x.deficit"]);
  });
});

describe("SignalValidator", () => {
  it("accepts the active knowledge pack definitions", () => {
    const { valid, issues } = signalValidator.validate(pack);
    expect(issues).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });
});

describe("SignalEngine", () => {
  const session = { id: "session-1" };
  const observations: Observation[] = pack.observations.definitions
    .filter((d) => d.id.endsWith(".deficit"))
    .map((d) =>
      observation({
        definitionId: d.id,
        questionId: d.questionId,
        category: d.category,
        severity: "high",
        confidence: 0.9,
      }),
    );

  it("generates signals purely from knowledge pack definitions", async () => {
    const { signals, summary } = await signalEngine.run({ session, observations, pack });
    expect(signals.length).toBeGreaterThan(0);
    expect(summary.evaluated).toBe(pack.signals.definitions.length);
    for (const signal of signals) {
      expect(signal.knowledgePackVersion).toBe(pack.manifest.version);
      expect(signal.supportingObservationIds.length).toBeGreaterThan(0);
      expect(signal.ruleExpression).toContain(signal.signalCode);
    }
  });

  it("is deterministic across repeated executions", async () => {
    const now = () => "2026-01-01T00:00:00.000Z";
    const a = await signalEngine.run({ session, observations, pack, now });
    const b = await signalEngine.run({ session, observations, pack, now });
    expect(JSON.stringify(a.signals)).toEqual(JSON.stringify(b.signals));
  });

  it("never emits duplicate signal codes", async () => {
    const { signals } = await signalEngine.run({
      session,
      observations: [...observations, ...observations],
      pack,
    });
    const codes = signals.map((s) => s.signalCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("produces no signals when there are no observations", async () => {
    const { signals } = await signalEngine.run({ session, observations: [], pack });
    expect(signals).toEqual([]);
  });

  it("processes 500 observations in under two seconds", async () => {
    const many: Observation[] = Array.from({ length: 500 }, (_, index) =>
      observation({
        definitionId: pack.observations.definitions[index % pack.observations.definitions.length].id,
        id: `bulk-${index}`,
      }),
    );
    const started = Date.now();
    await signalEngine.run({ session, observations: many, pack });
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
