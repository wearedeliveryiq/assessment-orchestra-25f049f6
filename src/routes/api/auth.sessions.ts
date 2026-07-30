import { createFileRoute } from "@tanstack/react-router";

import { listOwnSessions, revokeAllOwnSessions } from "@/lib/identity/service.server";
import { handleProtectedRoute, ok } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/sessions")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => ok(await listOwnSessions(identity))),
      DELETE: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          await revokeAllOwnSessions(identity, ctx);
          return ok({ revoked: true });
        }),
    },
  },
});
