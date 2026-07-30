import { createFileRoute } from "@tanstack/react-router";
import { handleAuditEvents } from "@/lib/audit/http.server";

/** GET /audit/events — filtered, paginated audit stream. */
export const Route = createFileRoute("/audit/events")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuditEvents(request),
    },
  },
});
