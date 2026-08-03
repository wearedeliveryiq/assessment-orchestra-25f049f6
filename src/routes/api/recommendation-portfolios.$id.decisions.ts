import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-portfolios/$id/decisions")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationPortfolioDecisions } =
          await import("@/lib/recommendation-decisions/http.server");
        return getRecommendationPortfolioDecisions(request, params.id);
      },
    },
  },
});
