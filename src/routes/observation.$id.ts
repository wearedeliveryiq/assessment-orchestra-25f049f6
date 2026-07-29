import { createFileRoute } from "@tanstack/react-router";
import { handleObservationRoute } from "@/lib/observations/http.server";

/** GET /observation/{id} — observation with its full traceability chain. */
export const Route = createFileRoute("/observation/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleObservationRoute(request, (service, ownerKey) =>
          service.getObservationTrace(params.id, ownerKey),
        ),
    },
  },
});
