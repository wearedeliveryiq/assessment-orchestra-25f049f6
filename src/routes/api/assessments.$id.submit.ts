import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/submit")({
  server: {
    handlers: {
      // POST — validates completeness, resets the pipeline and enters `processing`
      POST: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, (rt, ownerKey) => rt.submitAssessment(params.id, ownerKey));
      },
    },
  },
});
