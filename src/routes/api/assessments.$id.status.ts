import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/status")({
  server: {
    handlers: {
      // GET — lifecycle status plus per-stage processing state
      GET: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, (rt, ownerKey) => rt.getStatus(params.id, ownerKey));
      },
    },
  },
});
