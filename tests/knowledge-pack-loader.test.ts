import { describe, expect, it } from "vitest";
import {
  KnowledgePackError,
  KnowledgePackLoader,
  knowledgePackLoader,
} from "@/lib/knowledge-packs/loader.server";

describe("KnowledgePackLoader", () => {
  it("discovers the executive sponsorship pack", () => {
    expect(knowledgePackLoader.listPackIds()).toContain("executive-sponsorship");
  });

  it("loads and validates the active pack", () => {
    const pack = knowledgePackLoader.loadActive();
    expect(pack.manifest.id).toBe("executive-sponsorship");
    expect(pack.manifest.version).toBe(knowledgePackLoader.loadActive().manifest.version);
    expect(pack.observations.definitions.length).toBeGreaterThan(0);
    expect(pack.questions.questions.length).toBeGreaterThan(0);
  });

  it("exposes observation definitions to the engine", () => {
    const definitions = knowledgePackLoader.observationDefinitions();
    expect(definitions.every((d) => d.id && d.questionId && d.when.operator)).toBe(true);
  });

  it("caches the parsed pack", () => {
    const loader = new KnowledgePackLoader();
    expect(loader.loadActive()).toBe(loader.loadActive());
  });

  it("fails when the pack does not exist", () => {
    expect(() => knowledgePackLoader.load("missing-pack")).toThrow(KnowledgePackError);
  });

  it("fails when a required file is missing", () => {
    const loader = new KnowledgePackLoader({ broken: { "manifest.json": {} } }, "broken");
    expect(() => loader.loadActive()).toThrow(/missing required file/);
  });

  it("fails when a file does not match the schema", () => {
    const source = knowledgePackLoader.loadActive();
    const loader = new KnowledgePackLoader(
      {
        broken: {
          "manifest.json": { ...source.manifest, version: 1 },
          "questions.json": source.questions,
          "observations.json": source.observations,
          "signals.json": source.signals,
          "rules.json": source.rules,
          "patterns.json": source.patterns,
          "recommendations.json": source.recommendations,
          "narratives.json": source.narratives,
          "scoring.json": source.scoring,
        },
      },
      "broken",
    );
    expect(() => loader.loadActive()).toThrow(/failed validation in manifest.json/);
  });

  it("rejects a version mismatch", () => {
    expect(() => knowledgePackLoader.load("executive-sponsorship", "9.9.9")).toThrow(
      /does not match requested/,
    );
  });
});
