import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/history")({
  server: {
    handlers: {
      // GET — filterable execution history for the Runtime Monitor
      GET: async ({ request }) => {
        const { handleRoute, parseHistoryFilters } = await import(
          "@/lib/orchestrator/http.server"
        );
        return handleRoute(request, (api, ownerKey) =>
          api.history(parseHistoryFilters(request, ownerKey)),
        );
      },
    },
  },
});
