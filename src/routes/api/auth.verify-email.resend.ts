import { createFileRoute } from "@tanstack/react-router";

import { resendVerification } from "@/lib/identity/authentication.server";
import { firstPartyRedirect, handleAuthRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/verify-email/resend")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const body = await readJson(request);
          const redirectTo = firstPartyRedirect(request, body.redirectTo, "/auth/verify-email");
          await resendVerification(body.email, redirectTo, ctx);
          return ok({ sent: true });
        }),
    },
  },
});
