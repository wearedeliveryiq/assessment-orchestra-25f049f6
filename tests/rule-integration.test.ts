import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { observationEngine } from "@/lib/observations/engine.server";
import { signalEngine } from "@/lib/signals/engine.server";
import { ruleEngine } from "@/lib/rules/engine.server";
import type { AssessmentResponse } from "@/lib/assessment/types";

/**
 * Integration: Assessment -> Observation Engine -> Signal Engine -> Rule Engine.
 * All three engines are pure, so the pipeline runs end to end in memory.
 */
const pack = knowledgePackLoader.loadActive();
const session = { id: "rule-integration-session" };
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
  const { results, summary } = await ruleEngine.run({ session, signals, pack, now });
  return { observations, signals, results, summary };
}

describe("Assessment -> Observations -> Signals -> Rules", () => {
  it("derives rule results whose supporting signals all exist upstream", async () => {
    const { signals, results } = await pipeline(1);
    expect(results.length).toBe(pack.rules.definitions.length);

    const signalCodes = new Set(signals.map((s) => s.signalCode));
    for (const result of results) {
      expect(result.sessionId).toBe(session.id);
      expect(result.knowledgePackVersion).toBe(pack.manifest.version);
      for (const code of result.supportingSignalCodes) {
        expect(signalCodes.has(code)).toBe(true);
      }
      expect(result.evaluationReason.length).toBeGreaterThan(0);
    }

    // Weak answers must raise at least one risk rule.
    expect(results.filter((r) => r.status === "passed").length).toBeGreaterThan(0);
  });

  it("is repeatable and deterministic across runs", async () => {
    const first = await pipeline(1);
    const second = await pipeline(1);
    expect(second.results).toEqual(first.results);
  });

  it("raises fewer risk rules for strong answers", async () => {
    const weak = await pipeline(1);
    const strong = await pipeline(5);

    const risky = (results: typeof weak.results) =>
      results.filter((r) => r.status === "passed" && r.severity !== "info").length;

    expect(risky(strong.results)).toBeLessThan(risky(weak.results));
  });
});
