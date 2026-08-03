import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-resolution")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationResolution } =
          await import("@/lib/recommendation-resolution/http.server");
        return getRecommendationResolution(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationResolution } =
          await import("@/lib/recommendation-resolution/http.server");
        return postRecommendationResolution(request, params.id);
      },
    },
  },
});
