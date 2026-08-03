import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRecommendationAnalyticsAggregate } =
          await import("@/lib/recommendation-analytics/http.server");
        return getRecommendationAnalyticsAggregate(request);
      },
    },
  },
});
