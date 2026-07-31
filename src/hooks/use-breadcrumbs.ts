import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

import { buildBreadcrumbs, matchRoute, titleForPath } from "@/lib/shell/route-registry";
import { moduleForPath } from "@/lib/shell/navigation";

/**
 * BreadcrumbService hook. Trails are derived from the route registry, so pages
 * never hand-assemble them. `labels` overrides dynamic segments, e.g.
 * `useBreadcrumbs({ "/sessions/abc": "Delivery DNA Snapshot" })`.
 */
export function useBreadcrumbs(labels?: Record<string, string>) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return useMemo(
    () => ({
      pathname,
      crumbs: buildBreadcrumbs(pathname, { labels }),
      title: titleForPath(pathname),
      meta: matchRoute(pathname),
      module: moduleForPath(pathname),
    }),
    [pathname, labels],
  );
}
