import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/analysis-status")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getAnalysisHandoffStatus } = await import("@/lib/analysis/handoff-http.server");
        return getAnalysisHandoffStatus(request, params.id);
      },
    },
  },
});
