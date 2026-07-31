import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/resume")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { handleRuntimeRoute } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, (api, ownerKey) =>
          api.runtime.resume(params.id, ownerKey),
        );
      },
    },
  },
});
