import type { SearchProvider, SearchResult } from "./types";

/**
 * GlobalSearchService — a provider registry, not a search engine.
 *
 * Modules register a provider; the shell merges, ranks and de-duplicates the
 * results. Adding Reports or TeamMates search later means registering another
 * provider, with no change to the search UI.
 */

const providers = new Map<string, SearchProvider>();

export function registerSearchProvider(provider: SearchProvider): () => void {
  providers.set(provider.id, provider);
  return () => providers.delete(provider.id);
}

export function listSearchProviders(): SearchProvider[] {
  return [...providers.values()]
    .filter((provider) => provider.enabled?.() !== false)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function clearSearchProviders(): void {
  providers.clear();
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
  /** Restrict the query to specific providers. */
  providerIds?: string[];
}

/**
 * Runs every enabled provider in parallel. One failing provider degrades that
 * source only — the palette still shows everything else.
 */
export async function globalSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length === 0) return [];

  const active = listSearchProviders().filter(
    (provider) => !options.providerIds || options.providerIds.includes(provider.id),
  );

  const settled = await Promise.allSettled(
    active.map((provider) => provider.search(term, options.signal)),
  );

  const merged: SearchResult[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      merged.push(...outcome.value);
      return;
    }
    console.warn(`[shell] search provider "${active[index].id}" failed`, outcome.reason);
  });

  return rankResults(merged, term).slice(0, options.limit ?? 20);
}

/** Deterministic ranking: explicit score first, then prefix > word > substring. */
export function rankResults(results: SearchResult[], term: string): SearchResult[] {
  const needle = term.toLowerCase();
  const seen = new Set<string>();

  return results
    .filter((result) => {
      const key = `${result.kind}:${result.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((result) => {
      const title = result.title.toLowerCase();
      let score = result.score ?? 0;
      if (title === needle) score += 100;
      else if (title.startsWith(needle)) score += 60;
      else if (title.split(/\s+/).some((word) => word.startsWith(needle))) score += 40;
      else if (title.includes(needle)) score += 20;
      return { ...result, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title));
}

export function groupResultsByKind(results: SearchResult[]): { kind: string; label: string; items: SearchResult[] }[] {
  const labels: Record<string, string> = {
    navigation: "Go to",
    workspace: "Workspaces",
    organisation: "Organisations",
    user: "People",
    "knowledge-pack": "Knowledge Packs",
    assessment: "Assessments",
    report: "Reports",
    teammate: "TeamMates",
  };

  const groups = new Map<string, SearchResult[]>();
  for (const result of results) {
    const bucket = groups.get(result.kind) ?? [];
    bucket.push(result);
    groups.set(result.kind, bucket);
  }

  return [...groups.entries()].map(([kind, items]) => ({
    kind,
    label: labels[kind] ?? kind,
    items,
  }));
}
