import {
  DEFAULT_ACTIVE_PACK_ID,
  KnowledgePackError,
  knowledgePackRegistry,
} from "./registry.server";
import type { KnowledgePackDocument } from "./schema";

export { KnowledgePackError, DEFAULT_ACTIVE_PACK_ID };

/**
 * KnowledgePackLoader
 *
 * Thin, engine-facing facade over the Knowledge Pack Runtime. Engines keep
 * asking for definitions exactly as before; discovery, validation, versioning,
 * caching and activation are owned by the registry, so supporting a new
 * framework (P3M3, Governance, Benefits) is a configuration change only.
 */
export class KnowledgePackLoader {
  constructor(private readonly registry = knowledgePackRegistry) {}

  /** Every pack id discovered on disk, regardless of status. */
  listPackIds(): string[] {
    return this.registry.list().map((pack) => pack.packId);
  }

  /** The pack id the runtime currently reasons with. */
  activePackId(): string {
    return this.registry.activePackId();
  }

  /** The pack the platform currently reasons with. */
  loadActive(): KnowledgePackDocument {
    return this.registry.loadActive().document;
  }

  /** Loads a pack by id, optionally pinned to a version or semver range. */
  load(packId: string, expectedVersion?: string): KnowledgePackDocument {
    return this.registry.load(packId, expectedVersion).document;
  }

  /** Observation definitions exposed to the Observation Engine. */
  observationDefinitions(packId: string = this.activePackId()) {
    return this.load(packId).observations.definitions;
  }

  /** Signal definitions exposed to the Signal Engine. */
  signalDefinitions(packId: string = this.activePackId()) {
    return this.load(packId).signals.definitions;
  }

  /** Signal categories declared by the pack, used by the Signal Explorer. */
  signalCategories(packId: string = this.activePackId()) {
    return this.load(packId).signals.categories;
  }

  /** Rule definitions exposed to the Rule Engine. */
  ruleDefinitions(packId: string = this.activePackId()) {
    return this.load(packId).rules.definitions;
  }

  /** Rule categories declared by the pack, used by the Rule Explorer. */
  ruleCategories(packId: string = this.activePackId()) {
    return this.load(packId).rules.categories;
  }

  /** Pattern definitions exposed to the Pattern Engine. */
  patternDefinitions(packId: string = this.activePackId()) {
    return this.load(packId).patterns.definitions;
  }

  /** Pattern categories declared by the pack, used by the Pattern Explorer. */
  patternCategories(packId: string = this.activePackId()) {
    return this.load(packId).patterns.categories;
  }

  /** Scoring dimensions exposed to the Scoring Engine. */
  scoreDefinitions(packId: string = this.activePackId()) {
    return this.load(packId).scoring.dimensions;
  }

  /** Overall aggregation model declared by the pack. */
  overallScoreDefinition(packId: string = this.activePackId()) {
    return this.load(packId).scoring.overall;
  }

  /** Pack-wide scoring defaults (maturity bands, severity multipliers). */
  scoringDefaults(packId: string = this.activePackId()) {
    return this.load(packId).scoring.defaults;
  }

  /** Declarative narrative configuration consumed by the Narrative Engine. */
  narrativeConfig(packId: string = this.activePackId()) {
    return this.load(packId).narratives.narrative;
  }

  clearCache(): void {
    this.registry.reload("loader");
  }
}

/** Process-wide singleton — packs are immutable configuration. */
export const knowledgePackLoader = new KnowledgePackLoader();
