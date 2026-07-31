import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/summary")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { handleRuntimeRoute } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, (api, ownerKey) =>
          api.runtime.summary(params.id, ownerKey),
        );
      },
    },
  },
});
