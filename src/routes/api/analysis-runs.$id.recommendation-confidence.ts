import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-confidence")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationConfidenceGate } =
          await import("@/lib/recommendation-confidence/http.server");
        return getRecommendationConfidenceGate(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationConfidenceGate } =
          await import("@/lib/recommendation-confidence/http.server");
        return postRecommendationConfidenceGate(request, params.id);
      },
    },
  },
});
