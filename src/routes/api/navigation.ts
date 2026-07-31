import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { buildNavigation } from "@/lib/shell/navigation";

/**
 * GET /api/navigation — navigation metadata for the signed-in caller.
 *
 * Served dynamically so new modules, permissions and feature flags change the
 * sidebar without a client release.
 */
export const Route = createFileRoute("/api/navigation")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const permissions = (identity as { permissions?: string[] }).permissions ?? [];
          return ok({ sections: buildNavigation({ permissions, includePlanned: true }) });
        }),
    },
  },
});
