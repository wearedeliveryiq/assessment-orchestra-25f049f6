import { createFileRoute } from "@tanstack/react-router";

import { login } from "@/lib/identity/authentication.server";
import { handleAuthRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const body = await readJson(request);
          const result = await login(
            { email: body.email, password: body.password, rememberMe: Boolean(body.rememberMe) },
            ctx,
          );
          return ok(result);
        }),
    },
  },
});
