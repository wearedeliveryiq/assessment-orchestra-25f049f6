import { createFileRoute } from "@tanstack/react-router";

import { getRecommendationExperience } from "@/lib/recommendation-experience/http.server";

export const Route = createFileRoute("/api/recommendation-portfolios/$id/experience")({
  server: {
    handlers: {
      GET: ({ request, params }) => getRecommendationExperience(request, params.id),
    },
  },
});
