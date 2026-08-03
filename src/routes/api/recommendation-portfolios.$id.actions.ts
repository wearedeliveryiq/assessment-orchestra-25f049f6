import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-portfolios/$id/actions")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationPortfolioActions } =
          await import("@/lib/recommendation-actions/http.server");
        return getRecommendationPortfolioActions(request, params.id);
      },
    },
  },
});
