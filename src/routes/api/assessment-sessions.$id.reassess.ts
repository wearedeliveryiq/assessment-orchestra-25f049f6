import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { reassess } from "@/lib/sessions/session.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/reassess")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await reassess(
              identity,
              params.id,
              (await readJson(request)) as never,
              requestContext(request),
            ),
            201,
          ),
        ),
    },
  },
});
