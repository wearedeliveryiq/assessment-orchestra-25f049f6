import { createFileRoute } from "@tanstack/react-router";
import { handleObservationRoute } from "@/lib/observations/http.server";

/** GET /assessment/{id}/observations */
export const Route = createFileRoute("/assessment/$id/observations")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleObservationRoute(request, (service, ownerKey) =>
          service.listObservations(params.id, ownerKey),
        ),
    },
  },
});
