import { describe, expect, it } from "vitest";
import {
  KnowledgePackError,
  KnowledgePackLoader,
  knowledgePackLoader,
} from "@/lib/knowledge-packs/loader.server";
import { KnowledgePackRegistry } from "@/lib/knowledge-packs/registry.server";
import type { PackFileMap } from "@/lib/knowledge-packs/runtime-types";

function loaderFrom(packId: string, files: PackFileMap): KnowledgePackLoader {
  const registry = new KnowledgePackRegistry(() => [
    {
      packId,
      directoryVersion: null,
      key: packId,
      path: `knowledge-packs/${packId}`,
      files,
    },
  ]);
  return new KnowledgePackLoader(registry);
}

function expectValidationIssue(
  loader: KnowledgePackLoader,
  packId: string,
  code: string,
  file: string,
): void {
  try {
    loader.load(packId);
    throw new Error("Expected the knowledge pack to fail validation");
  } catch (error) {
    expect(error).toBeInstanceOf(KnowledgePackError);
    expect((error as KnowledgePackError).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, file })]),
    );
  }
}

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
    const loader = loaderFrom("broken", { "manifest.json": {} });
    expectValidationIssue(loader, "broken", "files.missing", "questions.json");
  });

  it("fails when a file does not match the schema", () => {
    const source = knowledgePackLoader.loadActive();
    const loader = loaderFrom("broken", {
      "manifest.json": { ...source.manifest, version: 1 },
      "questions.json": source.questions,
      "observations.json": source.observations,
      "signals.json": source.signals,
      "rules.json": source.rules,
      "patterns.json": source.patterns,
      "recommendations.json": source.recommendations,
      "narratives.json": source.narratives,
      "scoring.json": source.scoring,
    });
    expectValidationIssue(loader, "broken", "schema.invalid", "manifest.json");
  });

  it("rejects a version mismatch", () => {
    expect(() => knowledgePackLoader.load("executive-sponsorship", "9.9.9")).toThrow(
      /no version satisfying/,
    );
  });
});
