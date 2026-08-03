import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-governance/feature-flags")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postRecommendationFeatureFlag } =
          await import("@/lib/recommendation-governance/http.server");
        return postRecommendationFeatureFlag(request);
      },
    },
  },
});
