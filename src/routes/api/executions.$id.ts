import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id")({
  server: {
    handlers: {
      // GET — full execution view including per-stage detail
      GET: async ({ request, params }) => {
        const { handleRoute , requireUuid } = await import("@/lib/orchestrator/http.server");
        return handleRoute(request, (api, ownerKey) =>
          api.getExecution(requireUuid(params.id), ownerKey));
      },
    },
  },
});
