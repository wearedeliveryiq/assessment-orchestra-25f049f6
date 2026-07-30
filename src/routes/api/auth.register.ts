import { createFileRoute } from "@tanstack/react-router";

import { register } from "@/lib/identity/authentication.server";
import { handleAuthRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const body = await readJson(request);
          const result = await register(
            {
              email: body.email,
              password: body.password,
              firstName: body.firstName,
              lastName: body.lastName,
              redirectTo: typeof body.redirectTo === "string" ? body.redirectTo : undefined,
            },
            ctx,
          );
          return ok(result, 201);
        }),
    },
  },
});
