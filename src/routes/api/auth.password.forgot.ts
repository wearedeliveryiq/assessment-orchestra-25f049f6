import { createFileRoute } from "@tanstack/react-router";

import { requestPasswordReset } from "@/lib/identity/authentication.server";
import { handleAuthRoute, ok, originOf, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/password/forgot")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const body = await readJson(request);
          const redirectTo =
            typeof body.redirectTo === "string"
              ? body.redirectTo
              : `${originOf(request)}/auth/reset-password`;
          await requestPasswordReset(body.email, redirectTo, ctx);
          return ok({ sent: true });
        }),
    },
  },
});
