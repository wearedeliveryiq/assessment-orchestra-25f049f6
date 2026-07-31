import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { pause } from "@/lib/sessions/status.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/pause")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          return ok(
            await pause(identity, params.id, String(body.reason ?? ""), requestContext(request)),
          );
        }),
    },
  },
});
