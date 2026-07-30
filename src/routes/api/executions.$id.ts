import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id")({
  server: {
    handlers: {
      // GET — full execution view including per-stage detail
      GET: async ({ request, params }) => {
        const { handleRoute , requireUuid } = await import("@/lib/orchestrator/http.server");
        const id = requireUuid(params.id);
        return handleRoute(request, (api, ownerKey) => api.getExecution(id, ownerKey));
      },
    },
  },
});
