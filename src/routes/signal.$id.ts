import { createFileRoute } from "@tanstack/react-router";
import { handleSignalRoute } from "@/lib/signals/http.server";

/** GET /signal/{id} — signal with its full traceability chain. */
export const Route = createFileRoute("/signal/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleSignalRoute(request, (service, ownerKey) =>
          service.getSignalTrace(params.id, ownerKey),
        ),
    },
  },
});
