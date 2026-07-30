import type {
  AuditEntry,
  CacheStats,
  PackSummary,
  PackVersionEntry,
  ValidationReport,
} from "./runtime-types";

/** Browser client for the Knowledge Pack Runtime REST API. */

export interface PackOverview {
  runtime: { schemaVersion: number; engines: string[]; activePackId: string };
  packs: PackSummary[];
  cache: CacheStats;
  audit: AuditEntry[];
}

export interface PackDetail {
  pack: PackSummary;
  selected: PackVersionEntry;
  validation: ValidationReport;
  manifest: Record<string, unknown> | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export const knowledgePackKeys = {
  list: ["knowledge-packs"] as const,
  detail: (id: string, version?: string) => ["knowledge-pack", id, version ?? "active"] as const,
};

export const knowledgePackApi = {
  list: () => request<PackOverview>("/knowledge-packs"),
  get: (id: string, version?: string) =>
    request<PackDetail>(`/knowledge-pack/${id}${version ? `?version=${encodeURIComponent(version)}` : ""}`),
  versions: (id: string) =>
    request<{ packId: string; versions: PackVersionEntry[] }>(`/knowledge-pack/${id}/versions`),
  validate: (packId?: string, version?: string) =>
    request<{ reports: ValidationReport[]; valid: boolean }>("/knowledge-packs/validate", {
      method: "POST",
      body: JSON.stringify({ packId, version }),
    }),
  activate: (id: string, version?: string) =>
    request<{ pack: PackSummary }>(`/knowledge-pack/${id}/activate`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  reload: () => request<{ packs: PackSummary[]; cache: CacheStats }>("/knowledge-packs/reload", { method: "POST" }),
};
