import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { getDashboard } from "@/lib/sessions/session.server";

export const Route = createFileRoute("/api/assessment-sessions/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const search = new URL(request.url).searchParams;
          return ok(
            await getDashboard(identity, {
              organisationId: search.get("organisationId") ?? undefined,
              workspaceId: search.get("workspaceId") ?? undefined,
            }),
          );
        }),
    },
  },
});
