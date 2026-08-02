import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/explanations")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getExplanation } =
          await import("@/lib/delivery-intelligence/explainability-http.server");
        return getExplanation(request, params.id);
      },
    },
  },
});
