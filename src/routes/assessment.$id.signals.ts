import { createFileRoute } from "@tanstack/react-router";
import { handleSignalRoute } from "@/lib/signals/http.server";

/** GET /assessment/{id}/signals */
export const Route = createFileRoute("/assessment/$id/signals")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleSignalRoute(request, (service, ownerKey) => service.listSignals(params.id, ownerKey)),
    },
  },
});
