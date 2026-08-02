import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/api/analysis-runs/$id/recommendations/$recommendationId/accept",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { postRecommendationAcceptance } =
          await import("@/lib/delivery-intelligence/recommendation-http.server");
        return postRecommendationAcceptance(request, params.id, params.recommendationId);
      },
    },
  },
});
