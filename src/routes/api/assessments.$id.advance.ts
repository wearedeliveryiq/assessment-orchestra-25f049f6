import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/advance")({
  server: {
    handlers: {
      // POST — runs exactly one pending engine stage and returns runtime status
      POST: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, (rt, ownerKey) => rt.advance(params.id, ownerKey));
      },
    },
  },
});
