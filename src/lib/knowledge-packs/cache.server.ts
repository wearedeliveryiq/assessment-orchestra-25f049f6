import type { CacheStats } from "./runtime-types";

/**
 * KnowledgePackCache
 *
 * Small, observable LRU used by the registry so packs are parsed and validated
 * once per worker. Cached values are immutable configuration, so eviction is
 * only a memory concern — never a correctness one. Hot-reload is supported by
 * invalidating a pack id (dev) or the whole cache (after a reload request).
 */
export class KnowledgePackCache<T> {
  private readonly entries = new Map<string, T>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(private readonly maxEntries = 32) {}

  get(key: string): T | undefined {
    const value = this.entries.get(key);
    if (value === undefined) {
      this.misses += 1;
      return undefined;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, value);
    this.hits += 1;
    return value;
  }

  set(key: string, value: T): T {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
      this.evictions += 1;
    }
    return value;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Removes one key, or every key beginning with `<packId>@` when given a pack id. */
  invalidate(keyOrPackId: string): number {
    let removed = 0;
    if (this.entries.delete(keyOrPackId)) removed += 1;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(`${keyOrPackId}@`)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.entries.clear();
  }

  stats(): CacheStats {
    return {
      size: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      keys: [...this.entries.keys()],
    };
  }
}
