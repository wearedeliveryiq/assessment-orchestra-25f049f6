import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { getSessionDetail, updateSession } from "@/lib/sessions/session.server";

export const Route = createFileRoute("/api/assessment-sessions/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await getSessionDetail(identity, params.id)),
        ),
      PUT: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await updateSession(
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
