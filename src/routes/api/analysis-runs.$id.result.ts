import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id/result")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getWorkspaceResult } =
          await import("@/lib/delivery-intelligence/result-http.server");
        return getWorkspaceResult(request, params.id);
      },
    },
  },
});
