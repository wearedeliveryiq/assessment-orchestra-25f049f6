import {
  PACK_FILE_SCHEMAS,
  REQUIRED_PACK_FILES,
  type KnowledgePackDocument,
} from "./schema";

/**
 * KnowledgePackLoader
 *
 * Loads, validates, caches and versions Knowledge Packs. Packs live in
 * /knowledge-packs/<pack-id>/*.json and are bundled at build time, so no
 * runtime filesystem access is required in the worker environment.
 */

export class KnowledgePackError extends Error {
  constructor(
    message: string,
    readonly packId: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "KnowledgePackError";
  }
}

/** Raw pack sources: packId -> fileName -> parsed JSON. */
export type PackSources = Record<string, Record<string, unknown>>;

const globbed = import.meta.glob("../../../knowledge-packs/*/*.json", {
  eager: true,
}) as Record<string, { default: unknown }>;

function sourcesFromGlob(): PackSources {
  const sources: PackSources = {};
  for (const [path, mod] of Object.entries(globbed)) {
    const match = /knowledge-packs\/([^/]+)\/([^/]+\.json)$/.exec(path);
    if (!match) continue;
    const [, packId, fileName] = match;
    sources[packId] ??= {};
    sources[packId][fileName] = mod.default;
  }
  return sources;
}

export const DEFAULT_ACTIVE_PACK_ID = "executive-sponsorship";

export class KnowledgePackLoader {
  private readonly cache = new Map<string, KnowledgePackDocument>();

  constructor(
    private readonly sources: PackSources = sourcesFromGlob(),
    private readonly activePackId: string = DEFAULT_ACTIVE_PACK_ID,
  ) {}

  /** Every pack id discovered on disk, regardless of status. */
  listPackIds(): string[] {
    return Object.keys(this.sources).sort();
  }

  /** The pack the platform currently reasons with. */
  loadActive(): KnowledgePackDocument {
    return this.load(this.activePackId);
  }

  /**
   * Loads a pack by id (optionally pinned to a version), validating every
   * required file. Results are cached per pack id + version.
   */
  load(packId: string, expectedVersion?: string): KnowledgePackDocument {
    const cacheKey = `${packId}@${expectedVersion ?? "active"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const files = this.sources[packId];
    if (!files) {
      throw new KnowledgePackError(`Knowledge pack "${packId}" was not found`, packId);
    }

    const missing = REQUIRED_PACK_FILES.filter((file) => files[file] === undefined);
    if (missing.length > 0) {
      throw new KnowledgePackError(
        `Knowledge pack "${packId}" is missing required file(s): ${missing.join(", ")}`,
        packId,
      );
    }

    const parsed: Record<string, unknown> = {};
    for (const file of REQUIRED_PACK_FILES) {
      const result = PACK_FILE_SCHEMAS[file].safeParse(files[file]);
      if (!result.success) {
        const issue = result.error.issues[0];
        throw new KnowledgePackError(
          `Knowledge pack "${packId}" failed validation in ${file}: ${issue.path.join(".")} ${issue.message}`,
          packId,
          result.error,
        );
      }
      parsed[file.replace(".json", "")] = result.data;
    }

    const document = {
      manifest: parsed.manifest,
      questions: parsed.questions,
      observations: parsed.observations,
      signals: parsed.signals,
      rules: parsed.rules,
      patterns: parsed.patterns,
      recommendations: parsed.recommendations,
      narratives: parsed.narratives,
      scoring: parsed.scoring,
    } as KnowledgePackDocument;

    if (expectedVersion && document.manifest.version !== expectedVersion) {
      throw new KnowledgePackError(
        `Knowledge pack "${packId}" version ${document.manifest.version} does not match requested ${expectedVersion}`,
        packId,
      );
    }

    if (document.manifest.id !== packId) {
      throw new KnowledgePackError(
        `Knowledge pack "${packId}" declares mismatched id "${document.manifest.id}"`,
        packId,
      );
    }

    this.cache.set(cacheKey, document);
    return document;
  }

  /** Observation definitions exposed to the Observation Engine. */
  observationDefinitions(packId: string = this.activePackId) {
    return this.load(packId).observations.definitions;
  }

  /** Signal definitions exposed to the Signal Engine. */
  signalDefinitions(packId: string = this.activePackId) {
    return this.load(packId).signals.definitions;
  }

  /** Signal categories declared by the pack, used by the Signal Explorer. */
  signalCategories(packId: string = this.activePackId) {
    return this.load(packId).signals.categories;
  }

  /** Rule definitions exposed to the Rule Engine. */
  ruleDefinitions(packId: string = this.activePackId) {
    return this.load(packId).rules.definitions;
  }

  /** Rule categories declared by the pack, used by the Rule Explorer. */
  ruleCategories(packId: string = this.activePackId) {
    return this.load(packId).rules.categories;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/** Process-wide singleton — packs are immutable configuration. */
export const knowledgePackLoader = new KnowledgePackLoader();
