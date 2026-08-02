import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/analysis")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { analysisApi, handleAnalysisRoute } = await import("@/lib/analysis/http.server");
        return handleAnalysisRoute(
          request,
          (id, context) => analysisApi.analyse(id, context),
          params.id,
        );
      },
      GET: async ({ request, params }) => {
        const { analysisApi, handleAnalysisRoute } = await import("@/lib/analysis/http.server");
        return handleAnalysisRoute(
          request,
          (id, context) => analysisApi.latest(id, context),
          params.id,
        );
      },
    },
  },
});
