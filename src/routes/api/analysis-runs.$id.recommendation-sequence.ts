import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/recommendation-sequence")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationSequence } =
          await import("@/lib/recommendation-sequencing/http.server");
        return getRecommendationSequence(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationSequence } =
          await import("@/lib/recommendation-sequencing/http.server");
        return postRecommendationSequence(request, params.id);
      },
      PUT: async ({ request, params }) => {
        const { putRecommendationSequenceOverride } =
          await import("@/lib/recommendation-sequencing/http.server");
        return putRecommendationSequenceOverride(request, params.id);
      },
    },
  },
});
