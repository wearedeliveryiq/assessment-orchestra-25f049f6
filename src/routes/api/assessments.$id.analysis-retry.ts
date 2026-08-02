import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/analysis-retry")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { postAnalysisHandoffRetry } = await import("@/lib/analysis/handoff-http.server");
        return postAnalysisHandoffRetry(request, params.id);
      },
    },
  },
});
