/**
 * Pure tenancy helpers: slugs, colours and validation. Kept free of IO so the
 * rules can be unit tested and reused in the browser.
 */

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Appends a numeric discriminator until the slug is unique in `taken`. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const existing = new Set(taken);
  const root = slugify(base) || "workspace";
  if (!existing.has(root)) return root;
  let index = 2;
  while (existing.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function normaliseColour(value: unknown, fallback = "#5B8DEF"): string {
  return isHexColour(value) ? value.toUpperCase() : fallback;
}

export function trimmed(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  if (!next || next.length > max) return undefined;
  return next;
}

export function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  return next.length <= max ? next : undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 255 && EMAIL.test(value);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Case- and accent-insensitive partial match used by tenancy search. */
export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return slugify(haystack).includes(slugify(needle));
}

/** Recency ordering for the workspace switcher (most recent first). */
export function orderByRecency<T extends { lastVisitedAt: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.lastVisitedAt ? Date.parse(a.lastVisitedAt) : 0;
    const right = b.lastVisitedAt ? Date.parse(b.lastVisitedAt) : 0;
    return right - left;
  });
}
