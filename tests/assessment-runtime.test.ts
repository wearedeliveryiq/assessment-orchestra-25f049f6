import { beforeEach, describe, expect, it } from "vitest";
import {
  AssessmentRuntimeEngine,
  subscribeToRuntimeEvents,
} from "@/lib/runtime/engine";
import { InMemoryRuntimeStore } from "@/lib/runtime/store";
import { normaliseDefinition, AssessmentDefinitionError } from "@/lib/runtime/definition";
import { validateQuestion, isVisible } from "@/lib/runtime/validation";
import { computeProgress } from "@/lib/runtime/progress";
import type { AssessmentDefinition, RuntimeEvent } from "@/lib/runtime/types";

const OWNER = "owner-test";

/** Two different sample packs prove the runtime is metadata-driven only. */
const governancePack = {
  assessmentId: "governance",
  name: "Governance Maturity",
  description: "Sample pack A",
  sections: [
    {
      id: "s1",
      title: "Oversight",
      questionsPerPage: 2,
      questions: [
        {
          id: "q1",
          code: "G1",
          title: "Is there an accountable sponsor?",
          type: "boolean",
          required: true,
        },
        {
          id: "q2",
          code: "G2",
          title: "How mature is escalation?",
          type: "likert",
          required: true,
          options: [
            { value: 1, label: "Low" },
            { value: 5, label: "High" },
          ],
        },
        {
          id: "q3",
          code: "G3",
          title: "Escalation notes",
          type: "long_text",
          required: false,
          validationRules: [{ type: "maxLength", value: 20 }],
          displayConditions: [{ mode: "when", questionId: "q2", operator: "eq", value: 4 }],
        },
      ],
    },
    {
      id: "s2",
      title: "Funding",
      questions: [
        {
          id: "q4",
          code: "F1",
          title: "Annual budget",
          type: "currency",
          required: true,
          validationRules: [{ type: "min", value: 0 }],
        },
      ],
    },
  ],
};

const benefitsPack = {
  assessmentId: "benefits",
  name: "Benefits Realisation",
  description: "Sample pack B",
  sections: [
    {
      id: "b1",
      title: "Baseline",
      questions: [
        { id: "b-q1", code: "B1", title: "Baseline captured?", type: "boolean", required: true },
      ],
    },
  ],
};

function definitionOf(raw: unknown, packId: string): AssessmentDefinition {
  return normaliseDefinition(raw, { packId, packVersion: "1.0.0" });
}

function engineFor(raw: unknown, packId = "governance-pack") {
  const store = new InMemoryRuntimeStore();
  const engine = new AssessmentRuntimeEngine({
    store,
    loadDefinition: () => definitionOf(raw, packId),
  });
  return { store, engine };
}

/* ------------------------------- unit tests ------------------------------- */

describe("assessment loader", () => {
  it("normalises sections into explicit pages and counts", () => {
    const definition = definitionOf(governancePack, "governance-pack");
    expect(definition.questionCount).toBe(4);
    expect(definition.sections).toHaveLength(2);
    expect(definition.sections[0].pages).toHaveLength(2);
    expect(definition.estimatedMinutes).toBeGreaterThan(0);
  });

  it("executes a completely different pack without code changes", () => {
    const definition = definitionOf(benefitsPack, "benefits-pack");
    expect(definition.name).toBe("Benefits Realisation");
    expect(definition.questionCount).toBe(1);
  });

  it("rejects corrupt metadata", () => {
    expect(() => definitionOf({ sections: [] }, "broken")).toThrow(AssessmentDefinitionError);
  });

  it("rejects duplicate question ids", () => {
    const duplicate = {
      ...benefitsPack,
      sections: [
        {
          id: "b1",
          title: "Baseline",
          questions: [
            { id: "dup", code: "B1", title: "One", type: "boolean", required: true },
            { id: "dup", code: "B2", title: "Two", type: "boolean", required: true },
          ],
        },
      ],
    };
    expect(() => definitionOf(duplicate, "broken")).toThrow(/Duplicate question id/);
  });
});

describe("validation service", () => {
  const definition = definitionOf(governancePack, "governance-pack");
  const questions = definition.sections.flatMap((s) => s.pages.flatMap((p) => p.questions));
  const byId = (id: string) => questions.find((q) => q.id === id)!;

  it("flags missing required answers", () => {
    expect(validateQuestion(byId("q1"), null)).toHaveLength(1);
    expect(validateQuestion(byId("q1"), true)).toHaveLength(0);
  });

  it("applies metadata-driven rules", () => {
    expect(validateQuestion(byId("q3"), "x".repeat(30))[0]?.rule).toBe("maxLength");
    expect(validateQuestion(byId("q4"), -5)[0]?.rule).toBe("min");
    expect(validateQuestion(byId("q4"), 100)).toHaveLength(0);
  });

  it("evaluates display conditions", () => {
    expect(isVisible(byId("q3"), { q2: 1 })).toBe(false);
    expect(isVisible(byId("q3"), { q2: 4 })).toBe(true);
    expect(isVisible(byId("q1"), {})).toBe(true);
  });
});

describe("progress service", () => {
  it("derives completion from responses only", () => {
    const definition = definitionOf(governancePack, "governance-pack");
    const progress = computeProgress(definition, { q1: true, q2: 5 });
    expect(progress.questionsAnswered).toBe(2);
    expect(progress.percentComplete).toBeGreaterThan(0);
    expect(progress.percentComplete).toBeLessThan(100);
    expect(progress.sections).toHaveLength(2);
  });
});

/* ---------------------------- engine unit tests ---------------------------- */

describe("assessment runtime engine", () => {
  let engine: AssessmentRuntimeEngine;

  beforeEach(() => {
    engine = engineFor(governancePack).engine;
  });

  it("creates a session positioned on the first page", async () => {
    const snapshot = await engine.start({ ownerKey: OWNER });
    expect(snapshot.session.status).toBe("created");
    expect(snapshot.session.totalQuestions).toBe(4);
    expect(snapshot.navigation.currentPage?.id).toBe("s1.p1");
    expect(snapshot.navigation.canGoPrevious).toBe(false);
  });

  it("captures a single answer and returns validation", async () => {
    const { session } = await engine.start({ ownerKey: OWNER });
    const result = await engine.answer(session.id, OWNER, { questionId: "q1", value: true });
    expect(result.validation.valid).toBe(true);
    expect(result.snapshot.progress.questionsAnswered).toBe(1);
  });

  it("auto-saves a batch of answers without losing prior responses", async () => {
    const { session } = await engine.start({ ownerKey: OWNER });
    await engine.save(session.id, OWNER, { answers: [{ questionId: "q1", value: true }] });
    const saved = await engine.save(session.id, OWNER, {
      answers: [{ questionId: "q2", value: 5 }],
    });
    expect(saved.responses).toHaveLength(2);
    expect(saved.session.lastSavedAt).toBeTruthy();
  });

  it("navigates forward and back across pages and sections", async () => {
    const { session } = await engine.start({ ownerKey: OWNER });
    const next = await engine.navigate(session.id, OWNER, { direction: "next" });
    expect(next.navigation.pageIndex).toBe(1);
    const back = await engine.navigate(session.id, OWNER, { direction: "previous" });
    expect(back.navigation.pageIndex).toBe(0);
    const jumped = await engine.navigate(session.id, OWNER, {
      direction: "section",
      sectionId: "s2",
    });
    expect(jumped.navigation.currentSectionId).toBe("s2");
    expect(jumped.navigation.canGoNext).toBe(false);
  });

  it("refuses completion while required answers are missing", async () => {
    const { session } = await engine.start({ ownerKey: OWNER });
    await expect(engine.complete(session.id, OWNER)).rejects.toThrow();
  });

  it("rejects unknown sessions and invalid ids", async () => {
    await expect(engine.get("undefined", OWNER)).rejects.toThrow(/Invalid assessment id/);
    await expect(engine.get("11111111-1111-1111-1111-111111111111", OWNER)).rejects.toThrow(
      /not found/,
    );
  });

  it("isolates sessions by owner", async () => {
    const { session } = await engine.start({ ownerKey: OWNER });
    await expect(engine.get(session.id, "someone-else")).rejects.toThrow(/not found/);
  });
});

/* ---------------------------- integration test ----------------------------- */

describe("runtime lifecycle integration", () => {
  it("launches, answers, saves, pauses, resumes, completes and publishes", async () => {
    const events: RuntimeEvent[] = [];
    const unsubscribe = subscribeToRuntimeEvents((event) => events.push(event));
    const { engine } = engineFor(governancePack);

    // launch
    const started = await engine.start({ ownerKey: OWNER });
    const id = started.session.id;

    // answer page one, then auto-save
    await engine.save(id, OWNER, {
      answers: [
        { questionId: "q1", value: true },
        { questionId: "q2", value: 4 },
      ],
    });

    // navigate through the remaining pages
    await engine.navigate(id, OWNER, { direction: "next" });
    await engine.save(id, OWNER, { answers: [{ questionId: "q3", value: "short note" }] });
    await engine.navigate(id, OWNER, { direction: "next" });

    // pause and resume without losing anything
    const paused = await engine.pause(id, OWNER);
    expect(paused.session.status).toBe("paused");
    const resumed = await engine.resume(id, OWNER);
    expect(resumed.session.status).toBe("in_progress");
    expect(resumed.responses).toHaveLength(3);

    // finish the last section and complete
    await engine.save(id, OWNER, { answers: [{ questionId: "q4", value: 250000 }] });
    const summary = await engine.complete(id, OWNER);

    expect(summary.session.status).toBe("completed");
    expect(summary.session.locked).toBe(true);
    expect(summary.session.completedAt).toBeTruthy();
    expect(summary.progress.percentComplete).toBe(100);
    expect(summary.payload?.responses).toHaveLength(4);

    // responses are locked after completion
    await expect(
      engine.save(id, OWNER, { answers: [{ questionId: "q1", value: false }] }),
    ).rejects.toThrow();

    // events published for downstream Sprint 2 subscribers
    await new Promise((resolve) => setTimeout(resolve, 0));
    const types = events.map((event) => event.type);
    expect(types).toContain("assessment.started");
    expect(types).toContain("assessment.saved");
    expect(types).toContain("assessment.resumed");
    expect(types).toContain("assessment.completed");

    unsubscribe();
  });
});
