import { createFileRoute } from "@tanstack/react-router";
import { handleScoreRoute } from "@/lib/scores/http.server";

/**
 * GET /assessment/{id}/summary — dashboard-ready payload: overall assessment
 * score, dimension scores, maturity levels, confidence, supporting evidence
 * counts and a trend-ready series.
 */
export const Route = createFileRoute("/assessment/$id/summary")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleScoreRoute(request, (service, ownerKey) =>
          service.getAssessmentSummary(params.id, ownerKey),
        ),
    },
  },
});
