import { createFileRoute } from "@tanstack/react-router";

import { record } from "@/lib/audit/service.server";
import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";

interface IncomingEvent {
  event?: string;
  at?: string;
  detail?: Record<string, unknown>;
}

/**
 * POST /api/shell/audit — batched shell interaction events (navigation,
 * workspace switches, preference and theme changes, notification actions).
 */
export const Route = createFileRoute("/api/shell/audit")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const events = Array.isArray(body.events) ? (body.events as IncomingEvent[]) : [];

          for (const entry of events.slice(0, 50)) {
            if (typeof entry?.event !== "string") continue;
            record({
              engine: "user",
              eventType: `shell.${entry.event}`,
              entityType: "shell",
              userId: identity.user.id,
              severity: "info",
              timestamp: typeof entry.at === "string" ? entry.at : undefined,
              payload: entry.detail ?? {},
            });
          }

          return ok({ accepted: events.length });
        }),
    },
  },
});
