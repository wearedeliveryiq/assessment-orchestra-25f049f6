import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/complete")({
  server: {
    handlers: {
      // POST — validates, locks, timestamps and publishes the assessment payload
      POST: async ({ request, params }) => {
        const { handleRuntimeRoute } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, (api, ownerKey) =>
          api.runtime.complete(params.id, ownerKey),
        );
      },
    },
  },
});
