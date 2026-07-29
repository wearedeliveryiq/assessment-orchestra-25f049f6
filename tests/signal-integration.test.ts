import { describe, expect, it } from "vitest";

import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { observationEngine } from "@/lib/observations/engine.server";
import { signalEngine } from "@/lib/signals/engine.server";
import type { AssessmentResponse } from "@/lib/assessment/types";

/**
 * Integration: Assessment -> Observation Engine -> Signal Engine.
 * No database: both engines are pure, so the pipeline is exercised end to end
 * with in-memory responses.
 */
const pack = knowledgePackLoader.loadActive();
const session = { id: "integration-session" };

function responsesFor(value: number): AssessmentResponse[] {
  return pack.questions.questions.map((question, index) => ({
    id: `r-${index}`,
    sessionId: session.id,
    sectionId: question.sectionId,
    questionId: question.id,
    value,
    score: null,
    notes: null,
    answeredAt: "2026-01-01T00:00:00.000Z",
  })) as AssessmentResponse[];
}

async function pipeline(value: number) {
  const { observations } = await observationEngine.run({
    session,
    responses: responsesFor(value),
    pack,
    now: () => "2026-01-01T00:00:00.000Z",
  });
  const { signals, summary } = await signalEngine.run({
    session,
    observations,
    pack,
    now: () => "2026-01-01T00:00:00.000Z",
  });
  return { observations, signals, summary };
}

describe("Assessment -> Observation Engine -> Signal Engine", () => {
  it("turns weak answers into observations and then into signals", async () => {
    const { observations, signals } = await pipeline(1);
    expect(observations.length).toBeGreaterThan(0);
    expect(signals.length).toBeGreaterThan(0);

    const observationIds = new Set(observations.map((o) => o.id));
    for (const signal of signals) {
      expect(signal.sessionId).toBe(session.id);
      for (const id of signal.supportingObservationIds) {
        expect(observationIds.has(id)).toBe(true);
      }
    }
  });

  it("produces materially fewer risk signals for strong answers", async () => {
    const weak = await pipeline(1);
    const strong = await pipeline(5);
    expect(strong.signals.length).toBeLessThan(weak.signals.length);
  });

  it("returns identical results across repeated executions", async () => {
    const first = await pipeline(2);
    const second = await pipeline(2);
    expect(JSON.stringify(first.signals)).toEqual(JSON.stringify(second.signals));
    expect(first.summary.generated).toBe(second.summary.generated);
  });
});
