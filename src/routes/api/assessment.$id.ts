import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id")({
  server: {
    handlers: {
      // GET — definition, responses, progress and navigation state for a session
      GET: async ({ request, params }) => {
        const { handleRuntimeRoute } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, (api, ownerKey) => api.runtime.get(params.id, ownerKey));
      },
    },
  },
});
