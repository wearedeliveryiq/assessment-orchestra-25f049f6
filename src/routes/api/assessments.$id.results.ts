import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/results")({
  server: {
    handlers: {
      // GET — the persisted engine output for a completed assessment
      GET: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey) => ({
          session: (await rt.getAssessment(params.id, ownerKey)).session,
          results: await rt.getResults(params.id, ownerKey),
        }));
      },
    },
  },
});
