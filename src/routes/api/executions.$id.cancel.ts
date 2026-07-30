import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id/cancel")({
  server: {
    handlers: {
      // POST — requests cooperative cancellation of a running execution
      POST: async ({ request, params }) => {
        const { handleRoute , requireUuid } = await import("@/lib/orchestrator/http.server");
        const id = requireUuid(params.id);
        return handleRoute(request, (api, ownerKey) => api.cancel(id, ownerKey));
      },
    },
  },
});
