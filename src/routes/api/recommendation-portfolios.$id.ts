import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-portfolios/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationPortfolioById } =
          await import("@/lib/recommendation-portfolio/http.server");
        return getRecommendationPortfolioById(request, params.id);
      },
    },
  },
});
