import { createFileRoute } from "@tanstack/react-router";
import { handleDashboardExportRoute } from "@/lib/dashboard/http.server";

/** GET /assessment/{id}/export/{format} — json | pdf | pptx | print */
export const Route = createFileRoute("/assessment/$id/export/$format")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleDashboardExportRoute(request, params.id, params.format),
    },
  },
});
