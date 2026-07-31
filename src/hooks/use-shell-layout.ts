import { useEffect, useMemo, useState } from "react";

import { usePreferences } from "@/hooks/use-preferences";
import { breakpointFor, initialLayout, resolveLayout } from "@/lib/shell/layout";
import type { LayoutState } from "@/lib/shell/types";

/**
 * LayoutService hook — tracks the viewport, applies the responsive rules and
 * exposes the shell's region state (nav, drawer, context panel).
 */
export function useShellLayout() {
  const { preferences, update } = usePreferences();
  const [state, setState] = useState<LayoutState>(() => initialLayout(preferences.sidebarCollapsed));

  useEffect(() => {
    const sync = () =>
      setState((current) =>
        resolveLayout({ ...current, breakpoint: breakpointFor(window.innerWidth) }, preferences.sidebarCollapsed),
      );
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [preferences.sidebarCollapsed]);

  return useMemo(
    () => ({
      ...state,
      isMobile: state.breakpoint === "mobile",
      toggleNav: () => {
        if (state.breakpoint === "mobile") {
          setState((current) => ({ ...current, navDrawerOpen: !current.navDrawerOpen }));
          return;
        }
        const collapsed = !state.navCollapsed;
        setState((current) => ({ ...current, navCollapsed: collapsed }));
        void update({ sidebarCollapsed: collapsed });
      },
      closeNavDrawer: () => setState((current) => ({ ...current, navDrawerOpen: false })),
      setContextPanelOpen: (open: boolean) =>
        setState((current) => ({ ...current, contextPanelOpen: open })),
    }),
    [state, update],
  );
}
