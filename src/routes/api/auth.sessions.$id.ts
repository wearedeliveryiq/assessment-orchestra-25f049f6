import { createFileRoute } from "@tanstack/react-router";

import { revokeOwnSession } from "@/lib/identity/service.server";
import { failure, handleProtectedRoute, ok } from "@/lib/identity/http.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/auth/sessions/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          if (!UUID.test(params.id)) return failure("validation_failed", "Invalid session id.", 400);
          await revokeOwnSession(identity, params.id, ctx);
          return ok({ revoked: true });
        }),
    },
  },
});
