import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { listNotifications, markRead } from "@/lib/tenancy/notifications.server";

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await listNotifications(identity.user.id)),
        ),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
          await markRead(identity.user.id, ids);
          return ok({ read: true });
        }),
    },
  },
});
