import type { NarrativeConfig, NarrativeSectionDefinition } from "../knowledge-packs/schema";
import { EvidenceResolver, evidenceResolver } from "./evidence-resolver";
import type { NarrativeLlmProvider } from "./llm-provider.server";
import type {
  NarrativeEvidence,
  NarrativeSection,
  NarrativeSectionSource,
} from "./types";

/**
 * NarrativeComposer
 *
 * Single responsibility: turn one section definition plus resolved evidence
 * into narrative prose. It always produces a deterministic template rendering
 * first; AI output is only accepted when it is non-empty and passes the
 * pack's word-range policy, otherwise the template rendering is kept. This is
 * what makes hybrid mode safe: the narrative never depends on a model call.
 */

export const countWords = (text: string) =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

/** Collapses whitespace and drops model artefacts such as headings and bullets. */
export function normalise(text: string): string {
  return text
    .replace(/```[a-z]*|```/gi, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*•]\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderTemplate(template: string, tokens: Record<string, string>): string {
  return normalise(
    template.replace(/\{(\w+)\}/g, (match, key: string) =>
      tokens[key] === undefined ? match : tokens[key],
    ),
  );
}

export interface ComposeSectionInput {
  definition: NarrativeSectionDefinition;
  config: NarrativeConfig;
  evidence: NarrativeEvidence;
  tokens: Record<string, string>;
  provider: NarrativeLlmProvider | null;
}

export interface ComposeSectionResult {
  section: NarrativeSection;
  fallbackReason: string | null;
}

export class NarrativeComposer {
  constructor(private readonly resolver: EvidenceResolver = evidenceResolver) {}

  /** True when the section has nothing to talk about and needs its empty copy. */
  private isEmpty(definition: NarrativeSectionDefinition, evidence: NarrativeEvidence): boolean {
    const kinds = definition.evidence;
    if (kinds.includes("patterns") && evidence.patterns.length === 0) return true;
    if (kinds.includes("scores") && evidence.scores.length === 0) return true;
    return false;
  }

  buildPrompt(input: ComposeSectionInput, draft: string): string {
    const { definition, config, evidence } = input;
    const rules = config.promptRules;
    return [
      `Section: ${definition.title}`,
      `Audience: ${config.tone.audience}. Voice: ${config.tone.voice}. Register: ${config.tone.register}. Perspective: ${config.tone.perspective}.`,
      `Length: between ${definition.minWords} and ${definition.maxWords} words.`,
      definition.guidance ? `Guidance: ${definition.guidance}` : "",
      rules.must.length ? `You must:\n${rules.must.map((r) => `- ${r}`).join("\n")}` : "",
      rules.mustNot.length
        ? `You must not:\n${rules.mustNot.map((r) => `- ${r}`).join("\n")}`
        : "",
      "",
      "Evidence (the only facts you may use):",
      this.resolver.brief(evidence, definition.evidence),
      "",
      "Deterministic draft of this section (rewrite it into flowing prose; do not add facts):",
      draft,
      "",
      "Return only the section prose.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async compose(input: ComposeSectionInput): Promise<ComposeSectionResult> {
    const { definition, config, evidence, tokens, provider } = input;

    const empty = this.isEmpty(definition, evidence);
    const template = empty && definition.emptyTemplate ? definition.emptyTemplate : definition.template;
    const drafted = renderTemplate(template, tokens);

    let body = drafted;
    let source: NarrativeSectionSource = "template";
    let fallbackReason: string | null = null;

    const wantsAi =
      (config.generation.mode === "ai" || config.generation.mode === "hybrid") &&
      definition.aiEnabled &&
      !empty;

    if (wantsAi && !provider) {
      fallbackReason = `provider "${config.generation.provider}" unavailable`;
    } else if (wantsAi && provider) {
      try {
        const result = await provider.generate({
          system: config.promptRules.system,
          prompt: this.buildPrompt(input, drafted),
          temperature: config.generation.temperature,
          maxOutputTokens: config.generation.maxOutputTokens,
          model: config.generation.model,
        });
        const candidate = normalise(result.text);
        const words = countWords(candidate);
        if (!candidate) {
          fallbackReason = "model returned empty prose";
        } else if (words < definition.minWords || words > definition.maxWords * 1.5) {
          fallbackReason = `model output outside word range (${words} words)`;
        } else {
          body = candidate;
          source = "ai";
        }
      } catch (error) {
        fallbackReason = error instanceof Error ? error.message : String(error);
      }

      if (source === "template" && config.generation.mode === "ai" && !config.generation.fallbackToTemplate) {
        throw new Error(`Narrative section "${definition.key}" failed: ${fallbackReason}`);
      }
    }

    return {
      section: {
        key: definition.key,
        title: definition.title,
        order: definition.order,
        body,
        wordCount: countWords(body),
        source,
        guidance: definition.guidance,
        evidence: this.resolver.references(evidence, definition.evidence),
        fallbackReason,
      },
      fallbackReason,
    };
  }
}

export const narrativeComposer = new NarrativeComposer();
