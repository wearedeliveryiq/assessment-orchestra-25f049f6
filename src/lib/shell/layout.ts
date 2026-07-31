import type { Breakpoint, LayoutState } from "./types";

/**
 * LayoutService — breakpoint resolution and shell region rules.
 *
 * Pure functions so responsive behaviour is unit-testable without a browser.
 */

export const BREAKPOINTS = { tablet: 768, desktop: 1200 } as const;

export function breakpointFor(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return "mobile";
  if (width < BREAKPOINTS.desktop) return "tablet";
  return "desktop";
}

export function initialLayout(navCollapsed = false): LayoutState {
  return { breakpoint: "desktop", navCollapsed, navDrawerOpen: false, contextPanelOpen: false };
}

/**
 * On mobile the left navigation becomes an overlay drawer; on tablet it
 * collapses to icons; on desktop it honours the user's preference.
 */
export function resolveLayout(state: LayoutState, preferenceCollapsed: boolean): LayoutState {
  switch (state.breakpoint) {
    case "mobile":
      return { ...state, navCollapsed: false, contextPanelOpen: false };
    case "tablet":
      return { ...state, navCollapsed: true, navDrawerOpen: false };
    default:
      return { ...state, navCollapsed: preferenceCollapsed, navDrawerOpen: false };
  }
}

export function navRendersAsDrawer(breakpoint: Breakpoint): boolean {
  return breakpoint === "mobile";
}

export function contextPanelAvailable(breakpoint: Breakpoint): boolean {
  return breakpoint === "desktop";
}

/** Inline width the shell applies to the nav column, in token units. */
export function navWidth(state: LayoutState): string {
  if (navRendersAsDrawer(state.breakpoint)) return "0rem";
  return state.navCollapsed ? "var(--shell-nav-width-collapsed)" : "var(--shell-nav-width)";
}
