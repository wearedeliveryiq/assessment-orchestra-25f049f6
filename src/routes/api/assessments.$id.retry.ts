import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/retry")({
  server: {
    handlers: {
      // POST — re-queues failed stages without discarding saved responses
      POST: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, (rt, ownerKey) => rt.retryProcessing(params.id, ownerKey));
      },
    },
  },
});
