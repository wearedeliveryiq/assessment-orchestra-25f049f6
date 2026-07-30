import { createFileRoute } from "@tanstack/react-router";

import { updateOwnProfile } from "@/lib/identity/service.server";
import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/profile")({
  server: {
    handlers: {
      PATCH: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          return ok(await updateOwnProfile(identity, body, ctx));
        }),
    },
  },
});
