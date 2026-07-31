import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { transferOwnership } from "@/lib/sessions/ownership.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/owner")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await transferOwnership(
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
