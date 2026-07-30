import { createFileRoute } from "@tanstack/react-router";
import { handleAuditHealth } from "@/lib/audit/http.server";

/** GET /audit/health — publisher queue and dead-letter telemetry. */
export const Route = createFileRoute("/audit/health")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuditHealth(request),
    },
  },
});
