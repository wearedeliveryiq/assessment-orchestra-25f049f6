import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-analytics/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postRecommendationAnalyticsEvent } =
          await import("@/lib/recommendation-analytics/http.server");
        return postRecommendationAnalyticsEvent(request);
      },
    },
  },
});
