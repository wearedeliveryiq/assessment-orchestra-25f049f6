import { createFileRoute } from "@tanstack/react-router";
import { handleAuditEvent } from "@/lib/audit/http.server";

/** GET /audit/event/{id} — a single immutable audit record. */
export const Route = createFileRoute("/audit/event/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleAuditEvent(request, params.id),
    },
  },
});
