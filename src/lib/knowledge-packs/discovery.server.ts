import type { DiscoveredPack, PackFileMap } from "./runtime-types";

/**
 * Pack discovery.
 *
 * Packs are bundled at build time via `import.meta.glob`, so no runtime
 * filesystem access is needed in the worker. Two layouts are supported:
 *
 *   knowledge-packs/<pack-id>/*.json             (single-version pack)
 *   knowledge-packs/<pack-id>/<version>/*.json   (multi-version pack)
 */

const globbed = import.meta.glob("../../../knowledge-packs/**/*.json", {
  eager: true,
}) as Record<string, { default: unknown }>;

const PATH_RE = /knowledge-packs\/([^/]+)\/(?:([^/]+)\/)?([^/]+\.json)$/;

export function discoverPacks(
  modules: Record<string, { default: unknown }> = globbed,
): DiscoveredPack[] {
  const byKey = new Map<string, DiscoveredPack>();

  for (const [path, mod] of Object.entries(modules)) {
    const match = PATH_RE.exec(path);
    if (!match) continue;
    const [, packId, versionDir, fileName] = match;
    const key = versionDir ? `${packId}@${versionDir}` : packId;
    const existing = byKey.get(key);
    const files: PackFileMap = existing?.files ?? {};
    files[fileName] = mod.default;
    byKey.set(key, {
      packId,
      directoryVersion: versionDir ?? null,
      key,
      path: `knowledge-packs/${packId}${versionDir ? `/${versionDir}` : ""}`,
      files,
    });
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}
