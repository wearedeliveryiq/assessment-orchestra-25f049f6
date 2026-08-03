import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-analytics/consent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRecommendationAnalyticsConsent } =
          await import("@/lib/recommendation-analytics/http.server");
        return getRecommendationAnalyticsConsent(request);
      },
      POST: async ({ request }) => {
        const { postRecommendationAnalyticsConsent } =
          await import("@/lib/recommendation-analytics/http.server");
        return postRecommendationAnalyticsConsent(request);
      },
    },
  },
});
