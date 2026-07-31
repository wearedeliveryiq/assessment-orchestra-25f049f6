import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { assign } from "@/lib/sessions/assignment.server";
import { requestContext } from "@/lib/sessions/audit.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/assign")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await assign(
              identity,
              params.id,
              (await readJson(request)) as never,
              requestContext(request),
            ),
          ),
        ),
    },
  },
});
