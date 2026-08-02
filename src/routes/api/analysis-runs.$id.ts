import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getAnalysisRun } = await import("@/lib/analysis/http.server");
        return getAnalysisRun(request, params.id);
      },
    },
  },
});
