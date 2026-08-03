import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portfolio-items/$id/decisions")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationDecision } =
          await import("@/lib/recommendation-decisions/http.server");
        return getRecommendationDecision(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationDecision } =
          await import("@/lib/recommendation-decisions/http.server");
        return postRecommendationDecision(request, params.id);
      },
    },
  },
});
