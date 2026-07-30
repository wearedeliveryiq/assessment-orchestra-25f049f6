import { createFileRoute } from "@tanstack/react-router";
import { handleCreateReportRoute, handleListReportsRoute } from "@/lib/reports/http.server";

/** GET|POST /assessment/{id}/reports */
export const Route = createFileRoute("/assessment/$id/reports")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleListReportsRoute(request, params.id),
      POST: async ({ request, params }) => handleCreateReportRoute(request, params.id),
    },
  },
});
