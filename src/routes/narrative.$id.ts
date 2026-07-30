import { createFileRoute } from "@tanstack/react-router";
import { handleNarrativeRoute } from "@/lib/narrative/http.server";

/** GET /narrative/{id} — narrative with its full traceability chain. */
export const Route = createFileRoute("/narrative/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleNarrativeRoute(request, (service, ownerKey) =>
          service.getNarrativeTrace(params.id, ownerKey),
        ),
    },
  },
});
