import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearComponentRegistry, componentsForSlot, registerComponent } from "@/lib/shell/component-registry";
import { breakpointFor, initialLayout, navWidth, resolveLayout } from "@/lib/shell/layout";
import {
  NAVIGATION,
  buildNavigation,
  findNavItem,
  flattenNavigation,
  isNavItemActive,
  moduleForPath,
} from "@/lib/shell/navigation";
import {
  classify,
  dismissLocally,
  groupByModule,
  markReadLocally,
  toShellNotification,
  unreadCount,
} from "@/lib/shell/notifications";
import {
  DEFAULT_PREFERENCES,
  formatDate,
  formatNumber,
  mergePreferences,
  normalisePreferences,
  toggleFavouriteModule,
} from "@/lib/shell/preferences";
import { buildBreadcrumbs, humanise, matchRoute, routeAccess, titleForPath } from "@/lib/shell/route-registry";
import {
  clearSearchProviders,
  globalSearch,
  groupResultsByKind,
  listSearchProviders,
  rankResults,
  registerSearchProvider,
} from "@/lib/shell/search";
import { nextThemeMode, resolveTheme } from "@/lib/shell/theme";
import type { ShellNotification } from "@/lib/shell/types";

/* -------------------------------------------------------------------------- */
/* NavigationService                                                          */
/* -------------------------------------------------------------------------- */

describe("NavigationService", () => {
  it("hides permission-gated items from callers without the permission", () => {
    const withoutPermission = flattenNavigation(buildNavigation({ permissions: [] }));
    const withPermission = flattenNavigation(buildNavigation({ permissions: ["organisation.manage"] }));

    expect(withoutPermission.some((item) => item.id === "administration")).toBe(false);
    expect(withPermission.some((item) => item.id === "administration")).toBe(true);
  });

  it("drops sections that become empty and can exclude planned modules", () => {
    const sections = buildNavigation({ includePlanned: false });
    expect(sections.some((section) => section.id === "future")).toBe(false);
    expect(sections.every((section) => section.items.length > 0)).toBe(true);
  });

  it("respects feature flags", () => {
    const sections = buildNavigation({ featureFlags: {} }, [
      { id: "x", label: "X", items: [{ id: "beta", label: "Beta", icon: "home", to: "/beta", featureFlag: "beta" }] },
    ]);
    expect(sections).toHaveLength(0);
  });

  it("matches active items exactly, or by prefix when opted in", () => {
    const assessments = findNavItem("assessments", NAVIGATION)!;
    const home = findNavItem("home", NAVIGATION)!;

    expect(isNavItemActive(assessments, "/sessions")).toBe(true);
    expect(isNavItemActive(assessments, "/sessions/abc")).toBe(true);
    expect(isNavItemActive(home, "/home/other")).toBe(false);
  });

  it("resolves the owning module for a deep path", () => {
    expect(moduleForPath("/internal/knowledge-packs/pack-1")?.id).toBe("knowledge-packs");
  });
});

/* -------------------------------------------------------------------------- */
/* Route registry + BreadcrumbService                                         */
/* -------------------------------------------------------------------------- */

describe("BreadcrumbService", () => {
  it("prefers a literal route over a dynamic one", () => {
    expect(matchRoute("/sessions/new")?.title).toBe("New assessment");
    expect(matchRoute("/sessions/1234")?.title).toBe("Assessment");
  });

  it("derives a trail from route metadata", () => {
    const crumbs = buildBreadcrumbs("/internal/knowledge-packs");
    // `/internal` is marked hidden in the registry, so it is skipped in the trail.
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Home", "Knowledge Packs"]);
    expect(crumbs.at(-1)?.current).toBe(true);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });

  it("accepts overrides for dynamic segments", () => {
    const crumbs = buildBreadcrumbs("/internal/knowledge-packs/pack-1", {
      labels: { "/internal/knowledge-packs/pack-1": "Delivery DNA Snapshot" },
    });
    expect(crumbs.at(-1)?.label).toBe("Delivery DNA Snapshot");
  });

  it("humanises unknown and opaque segments", () => {
    expect(humanise("improvement-plans")).toBe("Improvement Plans");
    expect(humanise("2f1c9a34-1111-4c2a-9f00-abcdefabcdef")).toBe("2f1c9a34…");
  });

  it("resolves page titles and guards", () => {
    expect(titleForPath("/settings")).toBe("Settings");
    expect(routeAccess(matchRoute("/settings"), { isAuthenticated: false })).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
    expect(
      routeAccess(matchRoute("/organisations"), { isAuthenticated: true, permissions: [] }).reason,
    ).toBe("forbidden");
    expect(
      routeAccess(matchRoute("/organisations"), {
        isAuthenticated: true,
        permissions: ["organisation.manage"],
      }).allowed,
    ).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* ThemeService                                                               */
/* -------------------------------------------------------------------------- */

describe("ThemeService", () => {
  it("resolves system mode against the OS preference", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });

  it("cycles dark → light → system", () => {
    expect(nextThemeMode("dark")).toBe("light");
    expect(nextThemeMode("light")).toBe("system");
    expect(nextThemeMode("system")).toBe("dark");
  });
});

/* -------------------------------------------------------------------------- */
/* UserPreferencesService                                                     */
/* -------------------------------------------------------------------------- */

describe("UserPreferencesService", () => {
  it("falls back to defaults for invalid values", () => {
    const result = normalisePreferences({ theme: "neon", density: 5, language: "   " });
    expect(result.theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(result.density).toBe("comfortable");
    expect(result.language).toBe("en-GB");
  });

  it("merges patches without losing untouched keys", () => {
    const merged = mergePreferences(DEFAULT_PREFERENCES, { theme: "light", timezone: "Europe/Paris" });
    expect(merged.theme).toBe("light");
    expect(merged.timezone).toBe("Europe/Paris");
    expect(merged.landingPage).toBe(DEFAULT_PREFERENCES.landingPage);
  });

  it("toggles favourite modules idempotently", () => {
    const added = toggleFavouriteModule(DEFAULT_PREFERENCES, "assessments");
    expect(added.favouriteModules).toEqual(["assessments"]);
    expect(toggleFavouriteModule(added, "assessments").favouriteModules).toEqual([]);
  });

  it("formats dates and numbers with the caller's locale settings", () => {
    const preferences = mergePreferences(DEFAULT_PREFERENCES, {
      language: "en-GB",
      timezone: "UTC",
      dateFormat: "yyyy-MM-dd",
      numberFormat: "de-DE",
    });
    expect(formatDate("2026-03-05T10:00:00.000Z", preferences)).toContain("2026");
    expect(formatNumber(1234.5, preferences, { minimumFractionDigits: 1 })).toBe("1.234,5");
  });
});

/* -------------------------------------------------------------------------- */
/* NotificationCentreService                                                  */
/* -------------------------------------------------------------------------- */

function notification(overrides: Partial<ShellNotification> = {}): ShellNotification {
  return {
    id: crypto.randomUUID(),
    title: "Assessment completed",
    body: "",
    kind: "info",
    module: "assessment",
    eventType: "assessment.completed",
    createdAt: new Date().toISOString(),
    readAt: null,
    ...overrides,
  };
}

describe("NotificationCentreService", () => {
  it("classifies severity and action-required events", () => {
    expect(classify("error", "run.failed")).toBe("error");
    expect(classify("info", "invitation.received")).toBe("action");
    expect(classify("info", "assessment.completed")).toBe("success");
    expect(classify("info", "workspace.updated")).toBe("info");
  });

  it("builds deep links from metadata", () => {
    const shaped = toShellNotification({
      id: "n1",
      title: "Assessment assigned",
      eventType: "assessment.assigned",
      module: "assessment",
      metadata: { sessionId: "abc" },
    });
    expect(shaped.kind).toBe("action");
    expect(shaped.href).toBe("/sessions/abc");
  });

  it("counts unread, groups by module and applies local transitions", () => {
    const items = [
      notification({ id: "a", module: "assessment" }),
      notification({ id: "b", module: "organisation", readAt: new Date().toISOString() }),
      notification({ id: "c", module: "assessment" }),
    ];

    expect(unreadCount(items)).toBe(2);

    const groups = groupByModule(items);
    expect(groups[0]).toMatchObject({ module: "assessment", unread: 2 });

    expect(unreadCount(markReadLocally(items, ["a"]))).toBe(1);
    expect(dismissLocally(items, ["a", "b"]).map((item) => item.id)).toEqual(["c"]);
  });
});

/* -------------------------------------------------------------------------- */
/* GlobalSearchService                                                        */
/* -------------------------------------------------------------------------- */

describe("GlobalSearchService", () => {
  beforeEach(() => clearSearchProviders());

  it("registers and unregisters providers", () => {
    const unregister = registerSearchProvider({
      id: "p",
      label: "P",
      kinds: ["assessment"],
      search: async () => [],
    });
    expect(listSearchProviders()).toHaveLength(1);
    unregister();
    expect(listSearchProviders()).toHaveLength(0);
  });

  it("merges providers and ranks exact and prefix matches first", async () => {
    registerSearchProvider({
      id: "packs",
      label: "Packs",
      kinds: ["knowledge-pack"],
      search: async () => [
        { id: "1", kind: "knowledge-pack", title: "Delivery DNA Snapshot", href: "/a" },
        { id: "2", kind: "knowledge-pack", title: "Executive Sponsorship", href: "/b" },
      ],
    });
    registerSearchProvider({
      id: "workspaces",
      label: "Workspaces",
      kinds: ["workspace"],
      search: async () => [{ id: "3", kind: "workspace", title: "Delivery", href: "/c" }],
    });

    const results = await globalSearch("delivery");
    expect(results[0].title).toBe("Delivery");
    expect(results).toHaveLength(3);
    expect(groupResultsByKind(results).map((group) => group.kind)).toContain("workspace");
  });

  it("survives a failing provider", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerSearchProvider({
      id: "broken",
      label: "Broken",
      kinds: ["report"],
      search: async () => {
        throw new Error("offline");
      },
    });
    registerSearchProvider({
      id: "ok",
      label: "OK",
      kinds: ["assessment"],
      search: async () => [{ id: "1", kind: "assessment", title: "Sponsorship review", href: "/x" }],
    });

    await expect(globalSearch("sponsorship")).resolves.toHaveLength(1);
    warn.mockRestore();
  });

  it("de-duplicates identical results from multiple providers", () => {
    const ranked = rankResults(
      [
        { id: "1", kind: "workspace", title: "Alpha", href: "/a" },
        { id: "1", kind: "workspace", title: "Alpha", href: "/a" },
      ],
      "alpha",
    );
    expect(ranked).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/* LayoutService                                                              */
/* -------------------------------------------------------------------------- */

describe("LayoutService", () => {
  it("maps widths onto breakpoints", () => {
    expect(breakpointFor(375)).toBe("mobile");
    expect(breakpointFor(900)).toBe("tablet");
    expect(breakpointFor(1440)).toBe("desktop");
  });

  it("collapses the sidebar on tablet and drawers it on mobile", () => {
    const tablet = resolveLayout({ ...initialLayout(), breakpoint: "tablet" }, false);
    expect(tablet.navCollapsed).toBe(true);

    const mobile = resolveLayout({ ...initialLayout(true), breakpoint: "mobile" }, true);
    expect(mobile.navCollapsed).toBe(false);
    expect(navWidth(mobile)).toBe("0rem");
  });

  it("honours the stored preference on desktop", () => {
    const desktop = resolveLayout({ ...initialLayout(), breakpoint: "desktop" }, true);
    expect(desktop.navCollapsed).toBe(true);
    expect(navWidth(desktop)).toBe("var(--shell-nav-width-collapsed)");
  });
});

/* -------------------------------------------------------------------------- */
/* ComponentRegistryService                                                   */
/* -------------------------------------------------------------------------- */

describe("ComponentRegistryService", () => {
  beforeEach(() => clearComponentRegistry());

  it("returns slot components in order, filtered by permission", () => {
    const Widget = () => null;
    registerComponent({ id: "b", slot: "home-widget", label: "B", component: Widget, order: 2 });
    registerComponent({ id: "a", slot: "home-widget", label: "A", component: Widget, order: 1 });
    registerComponent({
      id: "admin",
      slot: "home-widget",
      label: "Admin",
      component: Widget,
      permission: "organisation.manage",
    });

    expect(componentsForSlot("home-widget").map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(
      componentsForSlot("home-widget", { permissions: ["organisation.manage"] }).map((entry) => entry.id),
    ).toEqual(["a", "b", "admin"]);
  });
});
