import { discoverPacks } from "./discovery.server";
import { KnowledgePackCache } from "./cache.server";
import { knowledgePackValidator } from "./validator.server";
import { compareVersions, latestVersion, satisfies } from "./version-manager";
import type { KnowledgePackDocument } from "./schema";
import type {
  AuditEntry,
  CacheStats,
  DiscoveredPack,
  LoadedPack,
  PackCounts,
  PackSummary,
  PackVersionEntry,
  ValidationIssue,
  ValidationReport,
} from "./runtime-types";

/** Raised whenever a pack cannot be discovered, validated or loaded. */
export class KnowledgePackError extends Error {
  constructor(
    message: string,
    readonly packId: string,
    readonly issues: ValidationIssue[] = [],
    readonly status = 400,
  ) {
    super(message);
    this.name = "KnowledgePackError";
  }
}

interface RegistryRecord {
  discovered: DiscoveredPack;
  entry: PackVersionEntry;
  document: KnowledgePackDocument | null;
  validation: ValidationReport;
  counts: PackCounts | null;
}

export const DEFAULT_ACTIVE_PACK_ID = "executive-sponsorship";
const AUDIT_LIMIT = 200;

/**
 * KnowledgePackRegistry
 *
 * Single source of truth for which packs exist, which versions they ship,
 * whether they are valid and which version the runtime is reasoning with.
 * Discovery, validation and dependency resolution all happen here once per
 * worker; engines only ever ask the registry for a loaded document.
 */
export class KnowledgePackRegistry {
  private records = new Map<string, RegistryRecord>();
  private readonly documentCache = new KnowledgePackCache<KnowledgePackDocument>(32);
  private readonly activations = new Map<string, string>();
  private readonly audit: AuditEntry[] = [];
  private initialised = false;

  constructor(private readonly discover: () => DiscoveredPack[] = discoverPacks) {}

  // ---------------------------------------------------------------- lifecycle

  /** Discovers and validates every pack on disk. Idempotent. */
  init(force = false): void {
    if (this.initialised && !force) return;
    const started = Date.now();
    const records = new Map<string, RegistryRecord>();

    for (const discovered of this.discover()) {
      const { report, document, counts } = knowledgePackValidator.validate(discovered);
      const manifest = document?.manifest;
      const version = manifest?.version ?? discovered.directoryVersion ?? "0.0.0";
      const key = `${discovered.packId}@${version}`;
      records.set(key, {
        discovered,
        document,
        validation: report,
        counts,
        entry: {
          packId: discovered.packId,
          version,
          key,
          name: manifest?.name ?? discovered.packId,
          status: manifest?.status ?? "draft",
          schemaVersion: manifest?.schemaVersion ?? 0,
          description: manifest?.description ?? "",
          owner: manifest?.owner ?? "unknown",
          author: manifest?.author ?? null,
          assessmentType: manifest?.assessmentType ?? null,
          tags: manifest?.tags ?? [],
          engines: manifest?.engines ?? [],
          dependencies: manifest?.dependencies ?? [],
          publishedAt: manifest?.publishedAt ?? "",
          path: discovered.path,
          valid: report.valid,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
          counts,
          active: false,
          latest: false,
        },
      });
    }

    this.records = records;
    this.resolveDependencies();
    this.markDerivedFlags();
    this.initialised = true;
    this.documentCache.clear();

    this.log({
      action: "discover",
      packId: "*",
      version: null,
      outcome: "success",
      detail: `${records.size} pack version(s) discovered`,
      durationMs: Date.now() - started,
    });
  }

  /** Re-runs discovery and validation, clearing every cached document. */
  reload(actor = "system"): { packs: PackSummary[]; cache: CacheStats } {
    this.documentCache.clear();
    this.init(true);
    this.log({ action: "reload", packId: "*", version: null, outcome: "success", detail: "registry reloaded", actor });
    return { packs: this.list(), cache: this.documentCache.stats() };
  }

  // ------------------------------------------------------------------ queries

  list(): PackSummary[] {
    this.init();
    const byPack = new Map<string, PackVersionEntry[]>();
    for (const record of this.records.values()) {
      const list = byPack.get(record.entry.packId) ?? [];
      list.push(record.entry);
      byPack.set(record.entry.packId, list);
    }

    return [...byPack.entries()]
      .map(([packId, versions]) => {
        const sorted = [...versions].sort((a, b) => compareVersions(b.version, a.version));
        const newest = sorted[0];
        return {
          packId,
          name: newest.name,
          description: newest.description,
          assessmentType: newest.assessmentType,
          latestVersion: latestVersion(sorted.map((v) => v.version)),
          activeVersion: sorted.find((v) => v.active)?.version ?? null,
          versions: sorted,
          valid: sorted.some((v) => v.valid),
        } satisfies PackSummary;
      })
      .sort((a, b) => a.packId.localeCompare(b.packId));
  }

  summary(packId: string): PackSummary {
    const found = this.list().find((pack) => pack.packId === packId);
    if (!found) throw new KnowledgePackError(`Knowledge pack "${packId}" was not found`, packId, [], 404);
    return found;
  }

  versions(packId: string): PackVersionEntry[] {
    return this.summary(packId).versions;
  }

  validationOf(packId: string, version?: string): ValidationReport {
    return this.record(packId, version).validation;
  }

  auditLog(limit = 50): AuditEntry[] {
    return this.audit.slice(-limit).reverse();
  }

  cacheStats(): CacheStats {
    return this.documentCache.stats();
  }

  // ------------------------------------------------------------------ loading

  /** Resolves the version the runtime should use for a pack. */
  resolveVersion(packId: string, requested?: string): string {
    this.init();
    const versions = [...this.records.values()].filter((record) => record.entry.packId === packId);
    if (versions.length === 0) {
      throw new KnowledgePackError(`Knowledge pack "${packId}" was not found`, packId, [], 404);
    }
    if (requested) {
      const exact = versions.find((record) => record.entry.version === requested);
      if (exact) return exact.entry.version;
      const ranged = versions
        .filter((record) => satisfies(record.entry.version, requested))
        .sort((a, b) => compareVersions(b.entry.version, a.entry.version))[0];
      if (ranged) return ranged.entry.version;
      throw new KnowledgePackError(
        `Knowledge pack "${packId}" has no version satisfying "${requested}"`,
        packId,
        [],
        404,
      );
    }

    const pinned = this.activations.get(packId);
    if (pinned && versions.some((record) => record.entry.version === pinned)) return pinned;

    const usable = versions.filter((record) => record.entry.valid);
    const pool = usable.length > 0 ? usable : versions;
    const activeStatus = pool.filter((record) =>
      ["active", "published"].includes(record.entry.status),
    );
    const candidates = (activeStatus.length > 0 ? activeStatus : pool).map((r) => r.entry.version);
    return latestVersion(candidates) ?? pool[0].entry.version;
  }

  /** Loads a validated pack document; throws when the pack has validation errors. */
  load(packId: string, version?: string): LoadedPack {
    this.init();
    const resolved = this.resolveVersion(packId, version);
    const key = `${packId}@${resolved}`;
    const record = this.records.get(key);
    if (!record) throw new KnowledgePackError(`Knowledge pack "${key}" was not found`, packId, [], 404);

    const cached = this.documentCache.get(key);
    if (cached) {
      return { packId, version: resolved, document: cached, manifest: cached.manifest, validation: record.validation };
    }

    if (!record.document || !record.validation.valid) {
      this.log({
        action: "error",
        packId,
        version: resolved,
        outcome: "failure",
        detail: `${record.validation.errorCount} validation error(s)`,
      });
      throw new KnowledgePackError(
        `Knowledge pack "${key}" failed validation`,
        packId,
        record.validation.issues.filter((issue) => issue.severity === "error"),
        422,
      );
    }

    this.documentCache.set(key, record.document);
    this.log({ action: "load", packId, version: resolved, outcome: "success", detail: "pack loaded" });
    return {
      packId,
      version: resolved,
      document: record.document,
      manifest: record.document.manifest,
      validation: record.validation,
    };
  }

  /** The pack the platform currently reasons with. */
  loadActive(): LoadedPack {
    return this.load(this.activePackId());
  }

  activePackId(): string {
    this.init();
    if (this.activations.has(DEFAULT_ACTIVE_PACK_ID) || this.records.size === 0) {
      return DEFAULT_ACTIVE_PACK_ID;
    }
    const explicit = [...this.activations.keys()][0];
    if (explicit) return explicit;
    const hasDefault = [...this.records.values()].some(
      (record) => record.entry.packId === DEFAULT_ACTIVE_PACK_ID && record.entry.valid,
    );
    if (hasDefault) return DEFAULT_ACTIVE_PACK_ID;
    const firstValid = this.list().find((pack) => pack.valid);
    return firstValid?.packId ?? DEFAULT_ACTIVE_PACK_ID;
  }

  /** Pins a pack to a specific version for this runtime. Validation must pass. */
  activate(packId: string, version: string | undefined, actor: string): PackSummary {
    this.init();
    const resolved = this.resolveVersion(packId, version);
    const record = this.records.get(`${packId}@${resolved}`);
    if (!record) throw new KnowledgePackError(`Knowledge pack "${packId}@${resolved}" was not found`, packId, [], 404);
    if (!record.validation.valid) {
      this.log({ action: "activate", packId, version: resolved, outcome: "failure", detail: "validation failed", actor });
      throw new KnowledgePackError(
        `Knowledge pack "${packId}@${resolved}" cannot be activated: it has ${record.validation.errorCount} validation error(s)`,
        packId,
        record.validation.issues.filter((issue) => issue.severity === "error"),
        422,
      );
    }
    if (record.entry.status === "archived" || record.entry.status === "retired") {
      throw new KnowledgePackError(
        `Knowledge pack "${packId}@${resolved}" is ${record.entry.status} and cannot be activated`,
        packId,
        [],
        409,
      );
    }

    this.activations.set(packId, resolved);
    this.markDerivedFlags();
    this.log({ action: "activate", packId, version: resolved, outcome: "success", detail: "pack activated", actor });
    return this.summary(packId);
  }

  // ------------------------------------------------------------------ internal

  private record(packId: string, version?: string): RegistryRecord {
    this.init();
    const resolved = this.resolveVersion(packId, version);
    const record = this.records.get(`${packId}@${resolved}`);
    if (!record) throw new KnowledgePackError(`Knowledge pack "${packId}" was not found`, packId, [], 404);
    return record;
  }

  /** Checks declared pack-to-pack dependencies once every pack is parsed. */
  private resolveDependencies(): void {
    for (const record of this.records.values()) {
      for (const dependency of record.entry.dependencies) {
        const available = [...this.records.values()]
          .filter((candidate) => candidate.entry.packId === dependency.packId && candidate.entry.valid)
          .map((candidate) => candidate.entry.version);
        const satisfied = available.some((candidateVersion) =>
          satisfies(candidateVersion, dependency.version),
        );
        if (satisfied) continue;
        const issue: ValidationIssue = {
          severity: dependency.optional ? "warning" : "error",
          code: "dependency.unsatisfied",
          file: "manifest.json",
          message: `Dependency "${dependency.packId}@${dependency.version}" is not satisfied by any installed pack`,
        };
        record.validation.issues.push(issue);
        if (issue.severity === "error") {
          record.validation.errorCount += 1;
          record.validation.valid = false;
          record.entry.valid = false;
        } else {
          record.validation.warningCount += 1;
        }
        record.entry.errorCount = record.validation.errorCount;
        record.entry.warningCount = record.validation.warningCount;
      }
    }
  }

  private markDerivedFlags(): void {
    const byPack = new Map<string, RegistryRecord[]>();
    for (const record of this.records.values()) {
      const list = byPack.get(record.entry.packId) ?? [];
      list.push(record);
      byPack.set(record.entry.packId, list);
    }
    for (const [packId, records] of byPack) {
      const newest = latestVersion(records.map((record) => record.entry.version));
      let activeVersion: string | null = this.activations.get(packId) ?? null;
      if (!activeVersion) {
        const valid = records.filter((record) => record.entry.valid);
        const pool = valid.length > 0 ? valid : records;
        const statusPool = pool.filter((record) => ["active", "published"].includes(record.entry.status));
        activeVersion = latestVersion((statusPool.length > 0 ? statusPool : pool).map((r) => r.entry.version));
      }
      for (const record of records) {
        record.entry.latest = record.entry.version === newest;
        record.entry.active = record.entry.version === activeVersion;
      }
    }
  }

  private log(entry: Omit<AuditEntry, "at" | "actor"> & { actor?: string }): void {
    this.audit.push({
      at: new Date().toISOString(),
      actor: entry.actor ?? "system",
      action: entry.action,
      packId: entry.packId,
      version: entry.version,
      outcome: entry.outcome,
      detail: entry.detail,
      durationMs: entry.durationMs,
    });
    if (this.audit.length > AUDIT_LIMIT) this.audit.splice(0, this.audit.length - AUDIT_LIMIT);
    if (entry.outcome === "failure") {
      console.error("[knowledge-pack-runtime]", entry.action, entry.packId, entry.detail);
    }
  }
}

/** Process-wide singleton — packs are immutable configuration. */
export const knowledgePackRegistry = new KnowledgePackRegistry();
