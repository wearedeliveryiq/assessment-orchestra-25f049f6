import type { Density, ThemeMode, UserPreferences } from "./types";

/**
 * UserPreferencesService — defaults, coercion and formatting helpers.
 *
 * Pure and isomorphic: the same normalisation runs in the browser (optimistic
 * updates) and on the server (before persistence), so the two can never drift.
 */

export const PREFERENCES_STORAGE_KEY = "deliveryiq.preferences";

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  language: "en-GB",
  timezone: "Europe/London",
  dateFormat: "dd MMM yyyy",
  numberFormat: "en-GB",
  density: "comfortable",
  reducedMotion: false,
  highContrast: false,
  sidebarCollapsed: false,
  favouriteModules: [],
  defaultWorkspaceId: null,
  landingPage: "/home",
};

const THEMES: ThemeMode[] = ["dark", "light", "system"];
const DENSITIES: Density[] = ["comfortable", "compact"];

function pickString(value: unknown, fallback: string, maxLength = 120): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.length > maxLength ? fallback : trimmed;
}

/** Coerces arbitrary input into a valid preference set. Never throws. */
export function normalisePreferences(input: unknown, base: UserPreferences = DEFAULT_PREFERENCES): UserPreferences {
  const raw = (input ?? {}) as Partial<Record<keyof UserPreferences, unknown>>;

  return {
    theme: THEMES.includes(raw.theme as ThemeMode) ? (raw.theme as ThemeMode) : base.theme,
    language: pickString(raw.language, base.language, 16),
    timezone: pickString(raw.timezone, base.timezone, 64),
    dateFormat: pickString(raw.dateFormat, base.dateFormat, 32),
    numberFormat: pickString(raw.numberFormat, base.numberFormat, 16),
    density: DENSITIES.includes(raw.density as Density) ? (raw.density as Density) : base.density,
    reducedMotion: typeof raw.reducedMotion === "boolean" ? raw.reducedMotion : base.reducedMotion,
    highContrast: typeof raw.highContrast === "boolean" ? raw.highContrast : base.highContrast,
    sidebarCollapsed:
      typeof raw.sidebarCollapsed === "boolean" ? raw.sidebarCollapsed : base.sidebarCollapsed,
    favouriteModules: Array.isArray(raw.favouriteModules)
      ? [...new Set(raw.favouriteModules.filter((id): id is string => typeof id === "string"))].slice(0, 24)
      : base.favouriteModules,
    defaultWorkspaceId:
      typeof raw.defaultWorkspaceId === "string" || raw.defaultWorkspaceId === null
        ? (raw.defaultWorkspaceId as string | null)
        : base.defaultWorkspaceId,
    landingPage: pickString(raw.landingPage, base.landingPage, 200),
  };
}

export function mergePreferences(
  current: UserPreferences,
  patch: Partial<UserPreferences>,
): UserPreferences {
  return normalisePreferences({ ...current, ...patch }, current);
}

export function toggleFavouriteModule(current: UserPreferences, moduleId: string): UserPreferences {
  const favourites = current.favouriteModules.includes(moduleId)
    ? current.favouriteModules.filter((id) => id !== moduleId)
    : [...current.favouriteModules, moduleId];
  return { ...current, favouriteModules: favourites };
}

/* ----------------------------- local persistence ---------------------------- */

/** Cached copy so the shell renders correctly before the API responds. */
export function readCachedPreferences(): UserPreferences | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? normalisePreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function cachePreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* private mode or quota — preferences still persist server-side */
  }
}

/* -------------------------------- formatting ------------------------------- */

const DATE_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  "dd MMM yyyy": { day: "2-digit", month: "short", year: "numeric" },
  "dd/MM/yyyy": { day: "2-digit", month: "2-digit", year: "numeric" },
  "MM/dd/yyyy": { month: "2-digit", day: "2-digit", year: "numeric" },
  "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
};

export function formatDate(value: string | Date, preferences: UserPreferences): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const options = DATE_PRESETS[preferences.dateFormat] ?? DATE_PRESETS["dd MMM yyyy"];
  return new Intl.DateTimeFormat(preferences.language, {
    ...options,
    timeZone: preferences.timezone,
  }).format(date);
}

export function formatNumber(
  value: number,
  preferences: UserPreferences,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(preferences.numberFormat, options).format(value);
}

/** "3 minutes ago" style stamps for the notification centre and timelines. */
export function formatRelative(value: string | Date, preferences: UserPreferences): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.348],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  let amount = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(amount) < size) {
      return new Intl.RelativeTimeFormat(preferences.language, { numeric: "auto" }).format(
        Math.round(amount),
        unit,
      );
    }
    amount /= size;
  }
  return formatDate(date, preferences);
}
