import { createFileRoute } from "@tanstack/react-router";

import { readIdentityEvents } from "@/lib/identity/audit.server";
import { handleProtectedRoute, ok } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/activity")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await readIdentityEvents(identity.user.id, 50)),
        ),
    },
  },
});
