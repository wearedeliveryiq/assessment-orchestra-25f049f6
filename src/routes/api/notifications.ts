import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { dismiss, listFeed, markRead } from "@/lib/shell/notifications.server";

/**
 * Notification centre feed.
 *
 * GET    — list notifications plus the unread count
 * POST   — mark the given ids as read (legacy shape, retained for callers)
 * DELETE — dismiss the given ids, or all, from the caller's feed
 */
export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => ok(await listFeed(identity.user.id))),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
          const updated = await markRead(identity.user.id, { ids, all: body.all === true });
          return ok({ read: true, updated });
        }),
      DELETE: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const ids = Array.isArray(body.ids) ? (body.ids as string[]) : undefined;
          const dismissed = await dismiss(identity.user.id, { ids, all: body.all === true });
          return ok({ dismissed });
        }),
    },
  },
});
