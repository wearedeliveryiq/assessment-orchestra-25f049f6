import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-governance/configuration-diff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRecommendationConfigurationDiff } =
          await import("@/lib/recommendation-governance/http.server");
        return getRecommendationConfigurationDiff(request);
      },
    },
  },
});
