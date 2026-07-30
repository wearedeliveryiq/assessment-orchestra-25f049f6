import { createFileRoute } from "@tanstack/react-router";
import { handleAuditDashboard } from "@/lib/audit/http.server";

/** GET /audit/dashboard — aggregated administration view. */
export const Route = createFileRoute("/audit/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuditDashboard(request),
    },
  },
});
