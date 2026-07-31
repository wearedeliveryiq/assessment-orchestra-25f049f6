import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { getHistory } from "@/lib/sessions/session.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/history")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const limit = new URL(request.url).searchParams.get("limit");
          return ok(await getHistory(identity, params.id, limit ? Number(limit) : undefined));
        }),
    },
  },
});
