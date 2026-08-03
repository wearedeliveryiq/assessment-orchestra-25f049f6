import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-portfolio")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationPortfolioForRun } =
          await import("@/lib/recommendation-portfolio/http.server");
        return getRecommendationPortfolioForRun(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationPortfolio } =
          await import("@/lib/recommendation-portfolio/http.server");
        return postRecommendationPortfolio(request, params.id);
      },
    },
  },
});
