import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { getPreferences, updatePreferences } from "@/lib/shell/preferences.server";

/** GET  /api/user/preferences — the caller's preference set (defaults if unset). */
/** PUT  /api/user/preferences — partial update, returns the merged result. */
export const Route = createFileRoute("/api/user/preferences")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await getPreferences(identity.user.id)),
        ),
      PUT: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          return ok(await updatePreferences(identity.user.id, body));
        }),
    },
  },
});
