import { createFileRoute } from "@tanstack/react-router";
import { handleDashboardRoute } from "@/lib/dashboard/http.server";

/** GET /assessment/{id}/dashboard */
export const Route = createFileRoute("/assessment/$id/dashboard")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleDashboardRoute(request, params.id),
    },
  },
});
