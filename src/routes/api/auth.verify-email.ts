import { createFileRoute } from "@tanstack/react-router";

import { confirmEmailVerified } from "@/lib/identity/authentication.server";
import { failure, handleAuthRoute, ok } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/verify-email")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const header = request.headers.get("authorization") ?? "";
          if (!header.startsWith("Bearer ")) {
            return failure("unauthenticated", "This verification link is no longer valid.", 401);
          }
          return ok(await confirmEmailVerified(header.slice(7).trim(), ctx));
        }),
    },
  },
});
