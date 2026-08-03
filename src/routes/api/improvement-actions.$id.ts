import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/improvement-actions/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationAction } =
          await import("@/lib/recommendation-actions/http.server");
        return getRecommendationAction(request, params.id);
      },
      PATCH: async ({ request, params }) => {
        const { patchRecommendationAction } =
          await import("@/lib/recommendation-actions/http.server");
        return patchRecommendationAction(request, params.id);
      },
    },
  },
});
