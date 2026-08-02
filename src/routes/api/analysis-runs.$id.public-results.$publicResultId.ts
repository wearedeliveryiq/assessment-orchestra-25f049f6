import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/public-results/$publicResultId")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const { deletePublicResult } =
          await import("@/lib/delivery-intelligence/public-http.server");
        return deletePublicResult(request, params.id, params.publicResultId);
      },
    },
  },
});
