import { createFileRoute } from "@tanstack/react-router";
import { handleReportRoute } from "@/lib/reports/http.server";

/** GET /report/{id} */
export const Route = createFileRoute("/report/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleReportRoute(request, params.id),
    },
  },
});
