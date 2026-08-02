import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/public-result")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { postPublicResult } = await import("@/lib/delivery-intelligence/public-http.server");
        return postPublicResult(request, params.id);
      },
    },
  },
});
