import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { observationEngine } from "@/lib/observations/engine.server";
import { signalEngine } from "@/lib/signals/engine.server";
import { ruleEngine } from "@/lib/rules/engine.server";
import { patternEngine } from "@/lib/patterns/engine.server";
import type { AssessmentResponse } from "@/lib/assessment/types";

/**
 * Integration: Assessment -> Observations -> Signals -> Rules -> Patterns.
 * Every engine is pure, so the whole pipeline runs end to end in memory.
 */
const pack = knowledgePackLoader.loadActive();
const session = { id: "pattern-integration-session" };
const now = () => "2026-01-01T00:00:00.000Z";

function responsesFor(value: number): AssessmentResponse[] {
  return pack.questions.questions.map((question, index) => ({
    id: `r-${index}`,
    sessionId: session.id,
    sectionId: question.sectionId,
    questionId: question.id,
    value,
    score: null,
    notes: null,
    answeredAt: now(),
  })) as AssessmentResponse[];
}

async function pipeline(value: number) {
  const { observations } = await observationEngine.run({
    session,
    responses: responsesFor(value),
    pack,
    now,
  });
  const { signals } = await signalEngine.run({ session, observations, pack, now });
  const { results } = await ruleEngine.run({ session, signals, pack, now });
  const { patterns, summary } = await patternEngine.run({ session, rules: results, pack, now });
  return { observations, signals, results, patterns, summary };
}

describe("Assessment -> Observations -> Signals -> Rules -> Patterns", () => {
  it("derives patterns whose supporting rules all exist upstream", async () => {
    const { results, patterns } = await pipeline(1);
    expect(patterns.length).toBeGreaterThan(0);

    const ruleCodes = new Set(results.map((r) => r.ruleCode));
    for (const pattern of patterns) {
      expect(pattern.sessionId).toBe(session.id);
      expect(pattern.knowledgePackVersion).toBe(pack.manifest.version);
      expect(pattern.supportingRuleCodes.length).toBeGreaterThan(0);
      for (const code of pattern.supportingRuleCodes) {
        expect(ruleCodes.has(code)).toBe(true);
      }
      expect(pattern.businessImpact.length).toBeGreaterThan(0);
      expect(pattern.evaluationReason.length).toBeGreaterThan(0);
    }
  });

  it("only reasons over rule results, never signals or observations", async () => {
    const { results, patterns } = await pipeline(1);
    const persistedRuleIds = new Set(results.map((r) => r.id));
    for (const pattern of patterns) {
      for (const id of pattern.supportingRuleIds) {
        expect(persistedRuleIds.has(id)).toBe(true);
      }
    }
  });

  it("is repeatable and deterministic across multiple runs", async () => {
    const first = await pipeline(1);
    const second = await pipeline(1);
    const third = await pipeline(1);
    expect(second.patterns).toEqual(first.patterns);
    expect(third.patterns).toEqual(first.patterns);
  });

  it("identifies fewer risk patterns for strong answers", async () => {
    const weak = await pipeline(1);
    const strong = await pipeline(5);

    const risky = (patterns: typeof weak.patterns) =>
      patterns.filter((p) => p.severity !== "info").length;

    expect(risky(strong.patterns)).toBeLessThan(risky(weak.patterns));
  });
});
