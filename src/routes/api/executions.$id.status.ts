import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id/status")({
  server: {
    handlers: {
      // GET — lightweight polling payload for the processing screen
      GET: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/orchestrator/http.server");
        return handleRoute(request, (api, ownerKey) => api.getStatus(params.id, ownerKey));
      },
    },
  },
});
