import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-priority")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationPriority } =
          await import("@/lib/recommendation-priority/http.server");
        return getRecommendationPriority(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationPriority } =
          await import("@/lib/recommendation-priority/http.server");
        return postRecommendationPriority(request, params.id);
      },
      PUT: async ({ request, params }) => {
        const { putRecommendationPriorityPreference } =
          await import("@/lib/recommendation-priority/http.server");
        return putRecommendationPriorityPreference(request, params.id);
      },
    },
  },
});
