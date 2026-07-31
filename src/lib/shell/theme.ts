import type { ResolvedTheme, ThemeMode } from "./types";

/**
 * ThemeService — resolves the active theme and applies it to the document.
 *
 * The DOM is the only place theme state lives at runtime: a `light`/`dark`
 * class on <html> plus accessibility classes. Components never branch on the
 * theme; they use design tokens, which the class swaps underneath them.
 */

export const THEME_STORAGE_KEY = "deliveryiq.theme";

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveTheme(mode: ThemeMode, system: ResolvedTheme = systemTheme()): ResolvedTheme {
  return mode === "system" ? system : mode;
}

export interface AppearanceOptions {
  reducedMotion?: boolean;
  highContrast?: boolean;
}

/** Applies the resolved theme and accessibility flags to <html>. */
export function applyTheme(theme: ResolvedTheme, options: AppearanceOptions = {}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("reduce-motion", options.reducedMotion === true);
  root.classList.toggle("high-contrast", options.highContrast === true);
  root.style.colorScheme = theme;
}

export function storeThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — the server-held preference remains authoritative */
  }
}

export function readStoredThemeMode(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" || value === "system" ? value : null;
  } catch {
    return null;
  }
}

/** Subscribes to OS theme changes; returns an unsubscribe function. */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? "light" : "dark");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Cycles dark → light → system, used by the top-bar toggle. */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : mode === "light" ? "system" : "dark";
}
