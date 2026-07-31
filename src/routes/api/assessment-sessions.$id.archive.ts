import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { archive, restore } from "@/lib/sessions/archive.server";
import { requestContext } from "@/lib/sessions/audit.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/archive")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          return ok(
            await archive(
              identity,
              params.id,
              { reason: String(body.reason ?? "") },
              requestContext(request),
            ),
          );
        }),
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await restore(identity, params.id, requestContext(request))),
        ),
    },
  },
});
