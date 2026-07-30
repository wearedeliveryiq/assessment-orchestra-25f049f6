import { createFileRoute } from "@tanstack/react-router";
import { handleNarrativeRoute } from "@/lib/narrative/http.server";

/** GET /assessment/{id}/narrative */
export const Route = createFileRoute("/assessment/$id/narrative")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleNarrativeRoute(request, (service, ownerKey) =>
          service.getNarrativeForAssessment(params.id, ownerKey),
        ),
    },
  },
});
