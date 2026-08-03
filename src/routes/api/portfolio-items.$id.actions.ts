import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portfolio-items/$id/actions")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { postRecommendationAction } =
          await import("@/lib/recommendation-actions/http.server");
        return postRecommendationAction(request, params.id);
      },
    },
  },
});
