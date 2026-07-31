import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { getTimeline } from "@/lib/sessions/session.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/timeline")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const search = new URL(request.url).searchParams;
          return ok(
            await getTimeline(identity, params.id, {
              limit: search.get("limit") ? Number(search.get("limit")) : undefined,
              before: search.get("before") ?? undefined,
            }),
          );
        }),
    },
  },
});
