/**
 * Semver-lite version manager.
 *
 * Packs are versioned `major.minor.patch` with an optional pre-release tag.
 * The runtime needs comparison, "latest" resolution and range satisfaction for
 * dependency checks — not a full semver implementation — so this stays
 * dependency free and deterministic.
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseVersion(version: string): ParsedVersion | null {
  const match = VERSION_RE.exec(version.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

/** -1 when a < b, 0 when equal, 1 when a > b. Invalid versions sort last. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return a.localeCompare(b);
  if (!left) return 1;
  if (!right) return -1;
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  if (left.prerelease === right.prerelease) return 0;
  if (left.prerelease === null) return 1; // release > prerelease
  if (right.prerelease === null) return -1;
  return left.prerelease.localeCompare(right.prerelease);
}

/** Highest version of the supplied list, ignoring unparsable entries when possible. */
export function latestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return [...versions].sort(compareVersions).at(-1) ?? null;
}

/**
 * Range satisfaction supporting the forms pack authors actually use:
 * `*`, `1.2.3`, `=1.2.3`, `^1.2.3`, `~1.2.3`, `>=1.2.3`, `>1.2.3`, `<=1.2.3`, `<1.2.3`.
 */
export function satisfies(version: string, range: string): boolean {
  const candidate = parseVersion(version);
  const trimmed = range.trim();
  if (!candidate) return false;
  if (trimmed === "*" || trimmed === "" || trimmed.toLowerCase() === "any") return true;

  const match = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(trimmed);
  if (!match) return false;
  const operator = match[1] ?? "=";
  const target = parseVersion(match[2]);
  if (!target) return false;

  const cmp = compareVersions(version, match[2]);
  switch (operator) {
    case "=":
      return cmp === 0;
    case ">":
      return cmp > 0;
    case ">=":
      return cmp >= 0;
    case "<":
      return cmp < 0;
    case "<=":
      return cmp <= 0;
    case "^":
      if (cmp < 0) return false;
      return target.major === 0
        ? candidate.major === 0 && candidate.minor === target.minor
        : candidate.major === target.major;
    case "~":
      if (cmp < 0) return false;
      return candidate.major === target.major && candidate.minor === target.minor;
    default:
      return false;
  }
}

export const versionManager = {
  parse: parseVersion,
  isValid: isValidVersion,
  compare: compareVersions,
  latest: latestVersion,
  satisfies,
};
