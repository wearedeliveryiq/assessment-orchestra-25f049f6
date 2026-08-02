import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-evaluation")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationEvaluation } =
          await import("@/lib/recommendation-evaluation/http.server");
        return getRecommendationEvaluation(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationEvaluation } =
          await import("@/lib/recommendation-evaluation/http.server");
        return postRecommendationEvaluation(request, params.id);
      },
    },
  },
});
