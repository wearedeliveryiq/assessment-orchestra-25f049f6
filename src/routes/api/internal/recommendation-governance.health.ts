import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-governance/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRecommendationOperationalHealth } =
          await import("@/lib/recommendation-governance/http.server");
        return getRecommendationOperationalHealth(request);
      },
    },
  },
});
