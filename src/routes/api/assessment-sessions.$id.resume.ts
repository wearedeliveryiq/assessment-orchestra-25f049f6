import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { resume } from "@/lib/sessions/status.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/resume")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await resume(identity, params.id, requestContext(request))),
        ),
    },
  },
});
