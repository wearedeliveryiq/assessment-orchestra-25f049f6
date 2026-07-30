import { createFileRoute } from "@tanstack/react-router";
import { handleReportDownloadRoute } from "@/lib/reports/http.server";

/** GET /report/{id}/download */
export const Route = createFileRoute("/report/$id/download")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleReportDownloadRoute(request, params.id),
    },
  },
});
