import type { AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import { NarrativeComposer, narrativeComposer, renderTemplate } from "./composer";
import { EvidenceResolver, evidenceResolver } from "./evidence-resolver";
import {
  NarrativeLlmRegistry,
  narrativeLlmRegistry,
  type NarrativeLlmProvider,
} from "./llm-provider.server";
import { NarrativeTemplateLoader, narrativeTemplateLoader } from "./template-loader.server";
import { NarrativeValidator, narrativeValidator } from "./validator";
import type {
  Narrative,
  NarrativeEvidence,
  NarrativeRunSummary,
  NarrativeSection,
} from "./types";

/**
 * NarrativeEngine
 *
 * Seventh stage of the DeliveryIQ reasoning pipeline. It consumes the outputs
 * of the earlier stages (scores, patterns and evidence counts) and produces an
 * executive narrative that is entirely governed by the active Knowledge Pack:
 * mode, provider, tone, prompt rules, section templates and validation policy.
 *
 * Pure and side-effect free apart from the model call delegated to a provider —
 * persistence belongs to the NarrativeExecutionService. Sections are composed
 * concurrently; a failure in one section never stops the others, because each
 * section always has a deterministic template rendering to fall back to.
 */

export interface NarrativeEngineInput {
  session: Pick<AssessmentSession, "id" | "organisationName">;
  pack: KnowledgePackDocument;
  evidence: NarrativeEvidence;
  now?: () => string;
}

export interface NarrativeEngineResult {
  narrative: Narrative;
  runSummary: NarrativeRunSummary;
}

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

export class NarrativeEngine {
  constructor(
    private readonly templates: NarrativeTemplateLoader = narrativeTemplateLoader,
    private readonly composer: NarrativeComposer = narrativeComposer,
    private readonly validator: NarrativeValidator = narrativeValidator,
    private readonly resolver: EvidenceResolver = evidenceResolver,
    private readonly registry: NarrativeLlmRegistry = narrativeLlmRegistry,
  ) {}

  /**
   * Narrative confidence is the evidential confidence of the assessment, not
   * of the prose: the weighted score confidence, softened when little pattern
   * evidence exists behind the findings.
   */
  private confidenceOf(evidence: NarrativeEvidence): number {
    const base =
      evidence.summary?.confidence ??
      (evidence.scores.length
        ? evidence.scores.reduce((sum, score) => sum + score.confidence, 0) / evidence.scores.length
        : 0);
    const breadth = evidence.patterns.length === 0 ? 0.6 : Math.min(1, 0.7 + evidence.patterns.length * 0.1);
    return round4(Math.max(0, Math.min(1, base * breadth)));
  }

  async run(input: NarrativeEngineInput): Promise<NarrativeEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, evidence, session } = input;

    const config = this.templates.config(pack);
    const definitions = this.templates.sections(config);
    const tokens = this.resolver.tokens(evidence);
    const confidence = this.confidenceOf(evidence);

    let provider: NarrativeLlmProvider | null = null;
    if (config.generation.mode !== "template") {
      provider = this.registry.resolve(config.generation);
      if (!provider) {
        console.warn(
          "[narrative-engine] provider unavailable, composing deterministically",
          config.generation.provider,
        );
      }
    }

    const fallbacks: { sectionKey: string; reason: string }[] = [];
    const composed = await Promise.all(
      definitions.map(async (definition) => {
        try {
          return await this.composer.compose({ definition, config, evidence, tokens, provider });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[narrative-engine] section failed", definition.key, message);
          fallbacks.push({ sectionKey: definition.key, reason: message });
          return null;
        }
      }),
    );

    const sections: NarrativeSection[] = [];
    for (const result of composed) {
      if (!result) continue;
      if (result.fallbackReason) {
        fallbacks.push({ sectionKey: result.section.key, reason: result.fallbackReason });
      }
      sections.push(result.section);
    }
    sections.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

    const validation = this.validator.validate(sections, config, confidence);
    const headline = renderTemplate(config.headline.template, tokens);
    const summarySection = sections.find((section) => section.key === "executive-summary");

    const narrative: Narrative = {
      id: `${session.id}:narrative`,
      sessionId: session.id,
      knowledgePack: pack.manifest.id,
      knowledgePackVersion: pack.manifest.version,
      headline,
      summary: summarySection?.body ?? sections[0]?.body ?? "",
      mode: config.generation.mode,
      provider: provider?.id ?? "template",
      model: provider ? config.generation.model : "",
      tone: config.tone.voice,
      audience: config.tone.audience,
      confidence,
      sections,
      evidence: {
        responseCount: evidence.counts.responses,
        observationCount: evidence.counts.observations,
        signalCount: evidence.counts.signals,
        ruleCount: evidence.counts.rules,
        patternCount: evidence.counts.patterns,
        dimensionCount: evidence.scores.length,
        overallPercentage: evidence.summary?.percentage ?? 0,
        maturityLevel: evidence.summary?.maturityLevel ?? "Not scored",
      },
      validation,
      generationMs: Date.now() - startedAt,
      createdAt: now(),
    };

    return {
      narrative,
      runSummary: {
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        mode: config.generation.mode,
        provider: narrative.provider,
        model: narrative.model,
        sectionsRequested: definitions.length,
        sectionsGenerated: sections.length,
        aiSections: sections.filter((section) => section.source === "ai").length,
        templateSections: sections.filter((section) => section.source === "template").length,
        fallbacks,
        invalid: validation.issues,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

export const narrativeEngine = new NarrativeEngine();
