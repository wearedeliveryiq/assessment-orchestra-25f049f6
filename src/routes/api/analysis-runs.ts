import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analysis-runs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postAnalysisRun } = await import("@/lib/analysis/http.server");
        return postAnalysisRun(request);
      },
    },
  },
});
