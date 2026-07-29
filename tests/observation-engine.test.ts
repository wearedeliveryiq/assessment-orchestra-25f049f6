import { describe, expect, it } from "vitest";
import { ObservationEngine, evaluateCondition } from "@/lib/observations/engine.server";
import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import type { AssessmentResponse } from "@/lib/assessment/types";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";

const pack = knowledgePackLoader.loadActive();
const engine = new ObservationEngine();
const session = { id: "11111111-1111-1111-1111-111111111111" };
const now = () => "2026-01-01T00:00:00.000Z";

function response(questionId: string, value: number): AssessmentResponse {
  return {
    questionId,
    sectionId: questionId.split(".")[0],
    value,
    score: value,
    notes: null,
    answeredAt: now(),
  };
}

function allResponses(value: number): AssessmentResponse[] {
  return pack.questions.questions.map((q) => response(q.id, value));
}

describe("evaluateCondition", () => {
  const answered = { value: 3, numeric: 3, label: "Established", answered: true };
  const missing = { value: null, numeric: null, label: null, answered: false };

  it("evaluates comparison operators", () => {
    expect(evaluateCondition({ operator: "lte", value: 3 }, answered)).toBe(true);
    expect(evaluateCondition({ operator: "lt", value: 3 }, answered)).toBe(false);
    expect(evaluateCondition({ operator: "eq", value: 3 }, answered)).toBe(true);
    expect(evaluateCondition({ operator: "gte", value: 4 }, answered)).toBe(false);
    expect(evaluateCondition({ operator: "between", value: 2, max: 4 }, answered)).toBe(true);
  });

  it("handles answered and unanswered questions", () => {
    expect(evaluateCondition({ operator: "unanswered" }, missing)).toBe(true);
    expect(evaluateCondition({ operator: "lte", value: 5 }, missing)).toBe(false);
    expect(evaluateCondition({ operator: "answered" }, answered)).toBe(true);
  });
});

describe("ObservationEngine", () => {
  it("generates deficit observations for low answers", async () => {
    const { observations } = await engine.run({
      session,
      responses: [response("flow.wip", 1)],
      pack,
      now,
    });
    const deficit = observations.find((o) => o.definitionId === "obs.flow_wip.deficit");
    expect(deficit).toBeDefined();
    expect(deficit?.severity).toBe("high");
    expect(deficit?.evidence).toContain("Absent");
    expect(deficit?.evidence).toContain("1/5");
    expect(deficit?.ruleExpression).toContain("flow.wip where value lte 2");
    expect(deficit?.knowledgePack).toBe("executive-sponsorship");
    expect(deficit?.knowledgePackVersion).toBe(knowledgePackLoader.loadActive().manifest.version);
  });

  it("generates strength observations for high answers", async () => {
    const { observations } = await engine.run({
      session,
      responses: [response("eng.deploy", 5)],
      pack,
      now,
    });
    expect(observations.map((o) => o.definitionId)).toContain("obs.eng_deploy.strength");
    expect(observations.map((o) => o.definitionId)).not.toContain("obs.eng_deploy.deficit");
  });

  it("generates an observation when a question is unanswered", async () => {
    const { observations } = await engine.run({ session, responses: [], pack, now });
    expect(observations.every((o) => o.definitionId.endsWith(".unanswered"))).toBe(true);
    expect(observations.length).toBe(pack.questions.questions.length);
  });

  it("can generate multiple observations across responses and none for a silent rule", async () => {
    const { observations, summary } = await engine.run({
      session,
      responses: allResponses(2),
      pack,
      now,
    });
    expect(observations.length).toBe(pack.questions.questions.length);
    expect(summary.skipped).toBeGreaterThan(0);
    expect(summary.failed).toEqual([]);
  });

  it("is deterministic and free of duplicates", async () => {
    const first = await engine.run({ session, responses: allResponses(3), pack, now });
    const second = await engine.run({ session, responses: allResponses(3), pack, now });
    expect(JSON.stringify(first.observations)).toBe(JSON.stringify(second.observations));
    const ids = first.observations.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("retains full provenance on every observation", async () => {
    const { observations } = await engine.run({ session, responses: allResponses(1), pack, now });
    for (const observation of observations) {
      expect(observation.sessionId).toBe(session.id);
      expect(observation.questionId).toBeTruthy();
      expect(observation.category).toBeTruthy();
      expect(observation.evidence).toBeTruthy();
      expect(observation.ruleExpression).toContain(observation.definitionId);
      expect(observation.sourceValue).toBe(1);
      expect(observation.sourceLabel).toBe("Absent");
    }
  });

  it("continues after a failing definition", async () => {
    const brokenPack = {
      ...pack,
      observations: {
        definitions: [
          {
            ...pack.observations.definitions[0],
            id: "obs.broken",
            get evidenceTemplate(): string {
              throw new Error("template exploded");
            },
          },
          pack.observations.definitions[0],
        ],
      },
    } as unknown as KnowledgePackDocument;

    const { observations, summary } = await engine.run({
      session,
      responses: allResponses(1),
      pack: brokenPack,
      now,
    });
    expect(summary.failed).toHaveLength(1);
    expect(observations).toHaveLength(1);
  });

  it("processes 250 responses in under two seconds", async () => {
    const bulk: AssessmentResponse[] = [];
    for (let index = 0; index < 250; index += 1) {
      const question = pack.questions.questions[index % pack.questions.questions.length];
      bulk.push(response(question.id, (index % 5) + 1));
    }
    const startedAt = Date.now();
    const { observations } = await engine.run({ session, responses: bulk, pack, now });
    expect(Date.now() - startedAt).toBeLessThan(2000);
    expect(observations.length).toBeGreaterThan(0);
  });
});
