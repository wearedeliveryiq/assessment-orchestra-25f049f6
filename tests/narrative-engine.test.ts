import { describe, expect, it } from "vitest";

import { NarrativeEngine } from "@/lib/narrative/engine.server";
import { NarrativeComposer, countWords, renderTemplate } from "@/lib/narrative/composer";
import { evidenceResolver } from "@/lib/narrative/evidence-resolver";
import { narrativeValidator } from "@/lib/narrative/validator";
import { NarrativeLlmRegistry, type NarrativeLlmProvider } from "@/lib/narrative/llm-provider.server";
import { NarrativeTemplateLoader } from "@/lib/narrative/template-loader.server";
import type { NarrativeEvidence } from "@/lib/narrative/types";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";

const narrativeConfig = {
  generation: {
    mode: "hybrid" as const,
    provider: "test",
    model: "test-model",
    temperature: 0.2,
    maxOutputTokens: 500,
    fallbackToTemplate: true,
  },
  tone: {
    voice: "Direct",
    audience: "Board",
    register: "formal",
    perspective: "third-person",
  },
  promptRules: { system: "Write.", must: ["Be evidence based"], mustNot: ["Invent facts"] },
  headline: { template: "{organisation}: {maturityLevel}", aiEnabled: false },
  sections: [
    {
      key: "executive-summary",
      title: "Executive Summary",
      order: 1,
      evidence: ["summary", "scores"] as const,
      aiEnabled: true,
      minWords: 5,
      maxWords: 60,
      guidance: "Say the position.",
      template:
        "{organisation} scores {overallPercentage}% ({maturityLevel}) with {weakestDimension} weakest at {weakestPercentage}% and {strongestDimension} strongest at {strongestPercentage}%.",
    },
    {
      key: "key-findings",
      title: "Key Findings",
      order: 2,
      evidence: ["patterns"] as const,
      aiEnabled: true,
      minWords: 3,
      maxWords: 60,
      guidance: "",
      template: "{findingList}",
      emptyTemplate: "No patterns met the evidence threshold.",
    },
  ],
  validation: {
    requiredSections: ["executive-summary", "key-findings"],
    bannedPhrases: ["as an ai"],
    requireEvidence: true,
    minConfidence: 0.2,
  },
};

function pack(): KnowledgePackDocument {
  return {
    manifest: { id: "test-pack", name: "Test Pack", version: "1.0.0" },
    questions: { questions: [] },
    narratives: {
      headlines: [{ band: "leading", text: "x" }],
      summaryTemplate: "legacy {organisation}",
      paragraphTemplates: ["p"],
      narrative: narrativeConfig,
    },
    recommendations: { recommendations: [] },
  } as unknown as KnowledgePackDocument;
}

function evidence(overrides: Partial<NarrativeEvidence> = {}): NarrativeEvidence {
  return {
    organisationName: "Acme Group",
    packId: "test-pack",
    packName: "Test Pack",
    packVersion: "1.0.0",
    summary: {
      id: "sum-1",
      sessionId: "s1",
      knowledgePack: "test-pack",
      knowledgePackVersion: "1.0.0",
      overallScore: 62,
      maximumScore: 100,
      percentage: 62,
      maturityLevel: "Developing",
      confidence: 0.8,
      dimensionCount: 2,
      patternCount: 1,
      breakdown: { weightingModel: "weighted-average", totalWeight: 3, dimensions: [] },
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    scores: [
      {
        id: "sc-1",
        sessionId: "s1",
        knowledgePack: "test-pack",
        knowledgePackVersion: "1.0.0",
        scoreCode: "SCR-001",
        dimension: "Sponsorship",
        overallScore: 80,
        maximumScore: 100,
        percentage: 80,
        maturityLevel: "Performing",
        confidence: 0.9,
        severity: "info",
        weight: 2,
        supportingPatternIds: ["p-1"],
        supportingPatternCodes: ["PAT-001"],
        calculationReason: "reason",
        scoreExpression: "expr",
        breakdown: {} as never,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "sc-2",
        sessionId: "s1",
        knowledgePack: "test-pack",
        knowledgePackVersion: "1.0.0",
        scoreCode: "SCR-002",
        dimension: "Governance",
        overallScore: 40,
        maximumScore: 100,
        percentage: 40,
        maturityLevel: "Critical",
        confidence: 0.7,
        severity: "high",
        weight: 1,
        supportingPatternIds: [],
        supportingPatternCodes: [],
        calculationReason: "reason",
        scoreExpression: "expr",
        breakdown: {} as never,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    patterns: [
      {
        id: "p-1",
        sessionId: "s1",
        knowledgePack: "test-pack",
        knowledgePackVersion: "1.0.0",
        patternCode: "PAT-001",
        name: "Governance Theatre",
        category: "governance",
        description: "Reporting exists without decisions.",
        businessImpact: "Decisions are delayed.",
        confidence: 0.75,
        severity: "high",
        weight: 1,
        supportingRuleIds: [],
        supportingRuleCodes: [],
        patternExpression: "ANY",
        evaluationReason: "matched",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    rules: [],
    signals: [],
    counts: { responses: 16, observations: 20, signals: 8, rules: 5, patterns: 1 },
    recommendations: [{ code: "r1", title: "Fix governance", rationale: "Because." }],
    ...overrides,
  };
}

const session = { id: "s1", organisationName: "Acme Group" };

function engineWith(provider?: NarrativeLlmProvider) {
  const registry = new NarrativeLlmRegistry(provider ? [provider] : []);
  return new NarrativeEngine(
    new NarrativeTemplateLoader(),
    new NarrativeComposer(),
    narrativeValidator,
    evidenceResolver,
    registry,
  );
}

describe("template rendering", () => {
  it("substitutes tokens and collapses whitespace", () => {
    expect(renderTemplate("Hello  {name}\n\nthere", { name: "Acme" })).toBe("Hello Acme there");
  });

  it("leaves unknown tokens intact so validation can catch them", () => {
    expect(renderTemplate("{unknown}", {})).toBe("{unknown}");
  });

  it("counts words", () => {
    expect(countWords(" one two  three ")).toBe(3);
  });
});

describe("evidence resolver", () => {
  it("derives tokens from persisted evidence only", () => {
    const tokens = evidenceResolver.tokens(evidence());
    expect(tokens.organisation).toBe("Acme Group");
    expect(tokens.strongestDimension).toBe("Sponsorship");
    expect(tokens.weakestDimension).toBe("Governance");
    expect(tokens.overallPercentage).toBe("62.0");
    expect(tokens.leadPattern).toBe("Governance Theatre");
  });

  it("cites scores and patterns per declared evidence kind", () => {
    const refs = evidenceResolver.references(evidence(), ["patterns"]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: "pattern", code: "PAT-001" });
  });

  it("builds a brief containing no facts beyond the evidence", () => {
    const brief = evidenceResolver.brief(evidence(), ["scores", "patterns"]);
    expect(brief).toContain("Sponsorship");
    expect(brief).toContain("Governance Theatre");
  });
});

describe("narrative engine", () => {
  it("generates every configured section deterministically without a provider", async () => {
    const { narrative, runSummary } = await engineWith().run({
      session,
      pack: pack(),
      evidence: evidence(),
    });

    expect(narrative.sections.map((s) => s.key)).toEqual(["executive-summary", "key-findings"]);
    expect(narrative.headline).toBe("Acme Group: Developing");
    expect(narrative.summary).toContain("Acme Group scores 62.0%");
    expect(runSummary.templateSections).toBe(2);
    expect(runSummary.aiSections).toBe(0);
    expect(narrative.validation.valid).toBe(true);
  });

  it("uses AI prose when the provider returns acceptable output", async () => {
    const provider: NarrativeLlmProvider = {
      id: "test",
      isAvailable: () => true,
      generate: async () => ({
        text: "Acme Group is developing overall, constrained by governance and supported by sponsorship strength.",
        provider: "test",
        model: "test-model",
      }),
    };
    const { narrative, runSummary } = await engineWith(provider).run({
      session,
      pack: pack(),
      evidence: evidence(),
    });

    expect(runSummary.aiSections).toBe(2);
    expect(narrative.provider).toBe("test");
    expect(narrative.sections[0].source).toBe("ai");
  });

  it("falls back to the template when the model fails", async () => {
    const provider: NarrativeLlmProvider = {
      id: "test",
      isAvailable: () => true,
      generate: async () => {
        throw new Error("rate limited");
      },
    };
    const { narrative, runSummary } = await engineWith(provider).run({
      session,
      pack: pack(),
      evidence: evidence(),
    });

    expect(runSummary.aiSections).toBe(0);
    expect(runSummary.fallbacks.length).toBeGreaterThan(0);
    expect(narrative.sections[0].body).toContain("Acme Group scores");
    expect(narrative.validation.valid).toBe(true);
  });

  it("rejects model output that breaches the word range", async () => {
    const provider: NarrativeLlmProvider = {
      id: "test",
      isAvailable: () => true,
      generate: async () => ({ text: "Too short.", provider: "test", model: "test-model" }),
    };
    const { narrative } = await engineWith(provider).run({
      session,
      pack: pack(),
      evidence: evidence(),
    });
    expect(narrative.sections[0].source).toBe("template");
    expect(narrative.sections[0].fallbackReason).toContain("word range");
  });

  it("uses the empty template when a section has no evidence", async () => {
    const { narrative } = await engineWith().run({
      session,
      pack: pack(),
      evidence: evidence({ patterns: [] }),
    });
    const findings = narrative.sections.find((s) => s.key === "key-findings");
    expect(findings?.body).toBe("No patterns met the evidence threshold.");
  });

  it("scales confidence with evidential breadth", async () => {
    const rich = await engineWith().run({ session, pack: pack(), evidence: evidence() });
    const thin = await engineWith().run({
      session,
      pack: pack(),
      evidence: evidence({ patterns: [] }),
    });
    expect(rich.narrative.confidence).toBeGreaterThan(thin.narrative.confidence);
  });
});

describe("narrative validator", () => {
  it("flags unresolved tokens, missing sections and banned phrases", () => {
    const result = narrativeValidator.validate(
      [
        {
          key: "executive-summary",
          title: "Executive Summary",
          order: 1,
          body: "As an AI, {unknown} happened.",
          wordCount: 5,
          source: "ai",
          guidance: "",
          evidence: [],
          fallbackReason: null,
        },
      ],
      narrativeConfig as never,
      0.9,
    );

    expect(result.valid).toBe(false);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("unresolved_token");
    expect(codes).toContain("banned_phrase");
    expect(codes).toContain("no_evidence");
    expect(codes).toContain("missing_section");
  });

  it("warns rather than fails on word-count drift", () => {
    const result = narrativeValidator.validate(
      [
        {
          key: "executive-summary",
          title: "Executive Summary",
          order: 1,
          body: "Short body.",
          wordCount: 2,
          source: "template",
          guidance: "",
          evidence: [
            {
              kind: "score",
              code: "SCR-001",
              entityId: "sc-1",
              label: "Sponsorship",
              detail: "80%",
              confidence: 0.9,
            },
          ],
          fallbackReason: null,
        },
        {
          key: "key-findings",
          title: "Key Findings",
          order: 2,
          body: "Some finding text here.",
          wordCount: 4,
          source: "template",
          guidance: "",
          evidence: [
            {
              kind: "pattern",
              code: "PAT-001",
              entityId: "p-1",
              label: "Governance Theatre",
              detail: "impact",
              confidence: 0.75,
            },
          ],
          fallbackReason: null,
        },
      ],
      narrativeConfig as never,
      0.9,
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain("too_short");
  });
});

describe("performance", () => {
  it("composes a full narrative over a large evidence set in under 2 seconds", async () => {
    const manyPatterns = Array.from({ length: 500 }, (_, index) => ({
      ...evidence().patterns[0],
      id: `p-${index}`,
      patternCode: `PAT-${index}`,
      name: `Pattern ${index}`,
    }));

    const started = Date.now();
    const { narrative } = await engineWith().run({
      session,
      pack: pack(),
      evidence: evidence({ patterns: manyPatterns }),
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(narrative.sections).toHaveLength(2);
  });
});
