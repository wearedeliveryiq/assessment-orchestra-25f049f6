import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/improvement-actions/$id/outcomes")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationActionOutcome } =
          await import("@/lib/recommendation-outcomes/http.server");
        return getRecommendationActionOutcome(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationActionOutcome } =
          await import("@/lib/recommendation-outcomes/http.server");
        return postRecommendationActionOutcome(request, params.id);
      },
    },
  },
});
