/**
 * Metadata cache.
 *
 * Only slow-changing reference data is cached: knowledge packs, categories,
 * platform settings and organisation settings. Business records are never
 * cached, so no read can serve stale tenant data.
 *
 * Entries are tagged; a write invalidates every entry carrying the tag it
 * touches, which keeps invalidation a one-liner for callers.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

const store = new Map<string, Entry<unknown>>();

export const CACHE_TTL = {
  short: 30_000,
  medium: 5 * 60_000,
  long: 30 * 60_000,
} as const;

export interface CacheOptions {
  ttlMs?: number;
  tags?: string[];
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, options: CacheOptions = {}): T {
  store.set(key, {
    value,
    expiresAt: Date.now() + (options.ttlMs ?? CACHE_TTL.medium),
    tags: options.tags ?? [],
  });
  return value;
}

/** Read-through helper: single call site for "cache or load". */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  return cacheSet(key, value, options);
}

export function invalidateKey(key: string): void {
  store.delete(key);
}

export function invalidateTag(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) store.delete(key);
  }
}

export function invalidateTags(tags: string[]): void {
  tags.forEach(invalidateTag);
}

export function clearCache(): void {
  store.clear();
}

export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}

/** Conventional tag names so producers and invalidators cannot drift apart. */
export const CacheTags = {
  knowledgePacks: "knowledge-packs",
  knowledgePack: (packId: string) => `knowledge-pack:${packId}`,
  categories: "categories",
  platformSettings: "platform-settings",
  organisationSettings: (organisationId: string) => `organisation-settings:${organisationId}`,
  workspaceSettings: (workspaceId: string) => `workspace-settings:${workspaceId}`,
  retention: "retention-policies",
};
