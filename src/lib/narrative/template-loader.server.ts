import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import type { KnowledgePackDocument, NarrativeConfig } from "../knowledge-packs/schema";

/**
 * NarrativeTemplateLoader
 *
 * Single responsibility: resolve the narrative configuration for a knowledge
 * pack and expose its sections in a deterministic order. Packs that ship no
 * narrative block fall back to a minimal generated configuration derived from
 * the legacy summary/paragraph templates, so no pack can break the pipeline.
 */
export class NarrativeTemplateLoader {
  constructor(private readonly loader = knowledgePackLoader) {}

  pack(packId?: string, packVersion?: string): KnowledgePackDocument {
    return packId ? this.loader.load(packId, packVersion) : this.loader.loadActive();
  }

  config(pack: KnowledgePackDocument): NarrativeConfig {
    const configured = pack.narratives.narrative;
    if (configured) return configured;
    return this.legacyConfig(pack);
  }

  /** Sections sorted by declared order, then key, so output is stable. */
  sections(config: NarrativeConfig) {
    return [...config.sections].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  }

  private legacyConfig(pack: KnowledgePackDocument): NarrativeConfig {
    if (!pack.narratives.summaryTemplate) {
      throw new KnowledgePackError(
        `Knowledge pack "${pack.manifest.id}" declares no narrative configuration`,
        pack.manifest.id,
      );
    }
    return {
      generation: {
        mode: "template",
        provider: "template",
        model: "",
        temperature: 0,
        maxOutputTokens: 900,
        fallbackToTemplate: true,
      },
      tone: {
        voice: "Direct, measured, consulting-grade",
        audience: "Executive leadership",
        register: "formal",
        perspective: "third-person",
      },
      promptRules: { system: "Write an evidence-based executive narrative.", must: [], mustNot: [] },
      headline: { template: "{organisation}: {maturityLevel}", aiEnabled: false },
      sections: [
        {
          key: "executive-summary",
          title: "Executive Summary",
          order: 1,
          evidence: ["summary", "scores"],
          aiEnabled: false,
          minWords: 0,
          maxWords: 250,
          guidance: "",
          template: pack.narratives.summaryTemplate,
        },
      ],
      validation: {
        requiredSections: ["executive-summary"],
        bannedPhrases: [],
        requireEvidence: false,
        minConfidence: 0,
      },
    };
  }
}

export const narrativeTemplateLoader = new NarrativeTemplateLoader();
