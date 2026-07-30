import { createFileRoute } from "@tanstack/react-router";

import { logout } from "@/lib/identity/authentication.server";
import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ ctx, identity }) => {
          const body = await readJson(request);
          await logout(
            identity,
            typeof body.refreshToken === "string" ? body.refreshToken : undefined,
            ctx,
          );
          return ok({ signedOut: true });
        }),
    },
  },
});
