import type { NarrativeGenerationConfig } from "../knowledge-packs/schema";

/**
 * LLM provider registry.
 *
 * The Narrative Engine never talks to a vendor directly: it asks the registry
 * for the provider named by the knowledge pack. Adding a provider is a change
 * to this file alone — engine, composer and validator are unaware of vendors.
 */

export interface NarrativeLlmRequest {
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  model: string;
}

export interface NarrativeLlmResult {
  text: string;
  provider: string;
  model: string;
}

export interface NarrativeLlmProvider {
  id: string;
  /** False when the provider has no credentials configured in this environment. */
  isAvailable(): boolean;
  generate(request: NarrativeLlmRequest): Promise<NarrativeLlmResult>;
}

export class NarrativeLlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NarrativeLlmError";
  }
}

/** Shared OpenAI-compatible chat completion caller. */
async function chatCompletion(
  providerId: string,
  baseUrl: string,
  headers: Record<string, string>,
  request: NarrativeLlmRequest,
  extraBody: Record<string, unknown> = {},
): Promise<NarrativeLlmResult> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({
      model: request.model,
      temperature: request.temperature,
      max_tokens: request.maxOutputTokens,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      ...extraBody,
    }),
  });



  if (response.status === 429) {
    throw new NarrativeLlmError("Narrative model rate limit exceeded", 429);
  }
  if (response.status === 402) {
    throw new NarrativeLlmError("AI credits exhausted for narrative generation", 402);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new NarrativeLlmError(
      `Narrative model request failed (${response.status}) ${detail.slice(0, 200)}`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new NarrativeLlmError("Narrative model returned an empty completion");

  return { text, provider: providerId, model: request.model };
}

/** Lovable AI Gateway — the default provider, no user-supplied key required. */
export const lovableProvider: NarrativeLlmProvider = {
  id: "lovable",
  isAvailable: () => Boolean(process.env.LOVABLE_API_KEY),
  generate: (request) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new NarrativeLlmError("LOVABLE_API_KEY is not configured");
    return chatCompletion(
      "lovable",
      "https://ai.gateway.lovable.dev/v1",
      { "Lovable-API-Key": key },
      request,
    );
  },
};

/** Any OpenAI-compatible endpoint, configured by environment. */
export const openAiCompatibleProvider: NarrativeLlmProvider = {
  id: "openai-compatible",
  isAvailable: () => Boolean(process.env.NARRATIVE_LLM_API_KEY),
  generate: (request) => {
    const key = process.env.NARRATIVE_LLM_API_KEY;
    if (!key) throw new NarrativeLlmError("NARRATIVE_LLM_API_KEY is not configured");
    const baseUrl = process.env.NARRATIVE_LLM_BASE_URL ?? "https://api.openai.com/v1";
    return chatCompletion(
      "openai-compatible",
      baseUrl,
      { authorization: `Bearer ${key}` },
      request,
    );
  },
};

/** Deterministic no-op provider so template mode never touches the network. */
export const templateProvider: NarrativeLlmProvider = {
  id: "template",
  isAvailable: () => false,
  generate: () => {
    throw new NarrativeLlmError("Template provider does not generate model output");
  },
};

export class NarrativeLlmRegistry {
  private readonly providers = new Map<string, NarrativeLlmProvider>();

  constructor(providers: NarrativeLlmProvider[] = []) {
    for (const provider of providers) this.providers.set(provider.id, provider);
  }

  register(provider: NarrativeLlmProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Returns null when the pack asks for an unknown or unconfigured provider. */
  resolve(config: Pick<NarrativeGenerationConfig, "provider">): NarrativeLlmProvider | null {
    const provider = this.providers.get(config.provider);
    if (!provider || !provider.isAvailable()) return null;
    return provider;
  }
}

export const narrativeLlmRegistry = new NarrativeLlmRegistry([
  lovableProvider,
  openAiCompatibleProvider,
  templateProvider,
]);
