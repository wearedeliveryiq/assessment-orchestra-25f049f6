import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/intelligence-result")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getLatestWorkspaceResult } =
          await import("@/lib/delivery-intelligence/result-http.server");
        return getLatestWorkspaceResult(request, params.id);
      },
    },
  },
});
