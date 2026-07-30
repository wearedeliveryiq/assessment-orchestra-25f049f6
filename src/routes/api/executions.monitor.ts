import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/monitor")({
  server: {
    handlers: {
      // GET — aggregated Runtime Monitor snapshot (metrics + stage timings)
      GET: async ({ request }) => {
        const { handleRoute, parseHistoryFilters } = await import(
          "@/lib/orchestrator/http.server"
        );
        return handleRoute(request, (api, ownerKey) =>
          api.monitor(parseHistoryFilters(request, ownerKey)),
        );
      },
    },
  },
});
