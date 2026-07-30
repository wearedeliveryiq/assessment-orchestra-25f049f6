import { createFileRoute } from "@tanstack/react-router";

import { updatePassword } from "@/lib/identity/authentication.server";
import { failure, handleAuthRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/password/change")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAuthRoute(request, async ({ ctx }) => {
          const header = request.headers.get("authorization") ?? "";
          if (!header.startsWith("Bearer ")) {
            return failure("unauthenticated", "Please sign in again.", 401);
          }
          const body = await readJson(request);
          const profile = await updatePassword(header.slice(7).trim(), body.newPassword, ctx, {
            reset: Boolean(body.reset),
          });
          return ok(profile);
        }),
    },
  },
});
