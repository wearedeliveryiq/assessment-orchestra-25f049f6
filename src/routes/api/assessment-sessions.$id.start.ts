import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { start } from "@/lib/sessions/status.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/start")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await start(identity, params.id, requestContext(request))),
        ),
    },
  },
});
