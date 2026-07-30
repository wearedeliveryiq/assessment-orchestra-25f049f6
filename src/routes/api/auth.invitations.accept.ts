import { createFileRoute } from "@tanstack/react-router";

import { acceptInvitation } from "@/lib/identity/service.server";
import { failure, handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/invitations/accept")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          if (typeof body.token !== "string" || body.token.length < 16) {
            return failure("validation_failed", "This invitation link is invalid.", 400);
          }
          const membership = await acceptInvitation(identity, body.token, ctx);
          return ok({ accepted: true, membership });
        }),
    },
  },
});
