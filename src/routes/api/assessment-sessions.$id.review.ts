import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { submitForReview } from "@/lib/sessions/status.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/review")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await submitForReview(identity, params.id, requestContext(request))),
        ),
    },
  },
});
