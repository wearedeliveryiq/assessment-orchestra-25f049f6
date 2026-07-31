import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { markRead } from "@/lib/shell/notifications.server";

/** PUT /api/notifications/read — mark specific notifications, or all, as read. */
export const Route = createFileRoute("/api/notifications/read")({
  server: {
    handlers: {
      PUT: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const ids = Array.isArray(body.ids) ? (body.ids as string[]) : undefined;
          const updated = await markRead(identity.user.id, { ids, all: body.all === true });
          return ok({ updated });
        }),
    },
  },
});
