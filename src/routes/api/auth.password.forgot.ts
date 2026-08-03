import { createFileRoute } from "@tanstack/react-router";

import { requestPasswordReset } from "@/lib/identity/authentication.server";
import { firstPartyRedirect, handleAuthRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/password/forgot")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const body = await readJson(request);
          const redirectTo = firstPartyRedirect(request, body.redirectTo, "/auth/reset-password");
          await requestPasswordReset(body.email, redirectTo, ctx);
          return ok({ sent: true });
        }),
    },
  },
});
