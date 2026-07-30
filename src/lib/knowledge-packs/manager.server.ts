import { knowledgePackRegistry, KnowledgePackError } from "./registry.server";
import { knowledgePackValidator } from "./validator.server";
import { discoverPacks } from "./discovery.server";
import type {
  AuditEntry,
  CacheStats,
  PackSummary,
  PackVersionEntry,
  ValidationReport,
} from "./runtime-types";
import { RUNTIME_SCHEMA_VERSION, SUPPORTED_ENGINES } from "./runtime-types";

/**
 * KnowledgePackManager
 *
 * Administrative surface of the Knowledge Pack Runtime: installation state,
 * lifecycle (activate / reload), validation on demand and runtime telemetry.
 * The manager never contains framework logic — it only orchestrates the
 * registry, validator and cache.
 */
export class KnowledgePackManager {
  constructor(private readonly registry = knowledgePackRegistry) {}

  overview(): {
    runtime: { schemaVersion: number; engines: string[]; activePackId: string };
    packs: PackSummary[];
    cache: CacheStats;
    audit: AuditEntry[];
  } {
    return {
      runtime: {
        schemaVersion: RUNTIME_SCHEMA_VERSION,
        engines: [...SUPPORTED_ENGINES],
        activePackId: this.registry.activePackId(),
      },
      packs: this.registry.list(),
      cache: this.registry.cacheStats(),
      audit: this.registry.auditLog(25),
    };
  }

  detail(packId: string, version?: string): {
    pack: PackSummary;
    selected: PackVersionEntry;
    validation: ValidationReport;
    manifest: unknown;
  } {
    const pack = this.registry.summary(packId);
    const resolved = this.registry.resolveVersion(packId, version);
    const selected = pack.versions.find((entry) => entry.version === resolved);
    if (!selected) {
      throw new KnowledgePackError(`Knowledge pack "${packId}@${resolved}" was not found`, packId, [], 404);
    }
    const validation = this.registry.validationOf(packId, resolved);
    let manifest: unknown = null;
    if (validation.valid) manifest = this.registry.load(packId, resolved).manifest;
    return { pack, selected, validation, manifest };
  }

  versions(packId: string): PackVersionEntry[] {
    return this.registry.versions(packId);
  }

  /** Validates an installed pack (or every installed pack) without activating it. */
  validate(packId?: string, version?: string): ValidationReport[] {
    if (packId) return [this.registry.validationOf(packId, version)];
    return discoverPacks().map((pack) => knowledgePackValidator.validate(pack).report);
  }

  activate(packId: string, version: string | undefined, actor: string): PackSummary {
    return this.registry.activate(packId, version, actor);
  }

  reload(actor: string) {
    return this.registry.reload(actor);
  }

  auditLog(limit = 50): AuditEntry[] {
    return this.registry.auditLog(limit);
  }
}

export const knowledgePackManager = new KnowledgePackManager();
