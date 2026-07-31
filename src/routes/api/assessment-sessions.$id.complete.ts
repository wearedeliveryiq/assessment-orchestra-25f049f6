import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { complete } from "@/lib/sessions/status.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/complete")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await complete(identity, params.id, requestContext(request))),
        ),
    },
  },
});
