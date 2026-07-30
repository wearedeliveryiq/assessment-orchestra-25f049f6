import type { KnowledgePackDocument, PackManifest, PackStatus } from "./schema";

/**
 * Shared contracts for the Knowledge Pack Runtime.
 *
 * The runtime discovers, validates, caches, versions and activates packs. It
 * knows nothing about any specific framework (Executive Sponsorship, P3M3,
 * Governance…) — everything framework-specific lives in the pack itself.
 */

/** Schema generation the runtime itself understands. */
export const RUNTIME_SCHEMA_VERSION = 1;

/** Engines a pack may declare support for. */
export const SUPPORTED_ENGINES = [
  "observations",
  "signals",
  "rules",
  "patterns",
  "scores",
  "recommendations",
  "narrative",
] as const;

export type SupportedEngine = (typeof SUPPORTED_ENGINES)[number];

/** Raw pack sources: packKey -> fileName -> parsed JSON. */
export type PackFileMap = Record<string, unknown>;

/** One physical pack version discovered on disk. */
export interface DiscoveredPack {
  /** Directory-derived pack id. */
  packId: string;
  /** Version folder when the pack uses `<id>/<version>/`, else null. */
  directoryVersion: string | null;
  /** Unique key for this physical location: `<packId>` or `<packId>@<version>`. */
  key: string;
  path: string;
  files: PackFileMap;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  /** Machine-readable code, e.g. `manifest.id-mismatch`, `crossref.missing-signal`. */
  code: string;
  /** Pack file the issue was found in, when applicable. */
  file?: string;
  path?: string;
  message: string;
}

export interface ValidationReport {
  packId: string;
  version: string | null;
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** ISO timestamp of the validation run. */
  validatedAt: string;
  durationMs: number;
}

export interface PackCounts {
  questions: number;
  sections: number;
  observations: number;
  signals: number;
  rules: number;
  patterns: number;
  scores: number;
  recommendations: number;
  narrativeSections: number;
}

/** Registry-level view of a pack version. */
export interface PackVersionEntry {
  packId: string;
  version: string;
  key: string;
  name: string;
  status: PackStatus;
  schemaVersion: number;
  description: string;
  owner: string;
  author: string | null;
  assessmentType: string | null;
  tags: string[];
  engines: string[];
  dependencies: { packId: string; version: string; optional: boolean }[];
  publishedAt: string;
  path: string;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  counts: PackCounts | null;
  /** True when this version is the one the runtime currently reasons with. */
  active: boolean;
  /** True when it is the highest semver of the pack. */
  latest: boolean;
}

/** Aggregated view of every version of a single pack. */
export interface PackSummary {
  packId: string;
  name: string;
  description: string;
  assessmentType: string | null;
  latestVersion: string | null;
  activeVersion: string | null;
  versions: PackVersionEntry[];
  valid: boolean;
}

export interface LoadedPack {
  packId: string;
  version: string;
  document: KnowledgePackDocument;
  manifest: PackManifest;
  validation: ValidationReport;
}

export type AuditAction =
  | "discover"
  | "load"
  | "validate"
  | "activate"
  | "reload"
  | "cache-hit"
  | "cache-miss"
  | "error";

export interface AuditEntry {
  at: string;
  action: AuditAction;
  packId: string;
  version: string | null;
  outcome: "success" | "failure";
  detail: string;
  actor: string;
  durationMs?: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  keys: string[];
}
