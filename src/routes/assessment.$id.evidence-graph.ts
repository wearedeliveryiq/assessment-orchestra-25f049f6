import { createFileRoute } from "@tanstack/react-router";
import { handleEvidenceGraph } from "@/lib/audit/http.server";

/** GET /assessment/{id}/evidence-graph — the full explainability graph. */
export const Route = createFileRoute("/assessment/$id/evidence-graph")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleEvidenceGraph(request, params.id),
    },
  },
});
