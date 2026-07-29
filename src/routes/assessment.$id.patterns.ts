import { createFileRoute } from "@tanstack/react-router";
import { handlePatternRoute } from "@/lib/patterns/http.server";

/** GET /assessment/{id}/patterns */
export const Route = createFileRoute("/assessment/$id/patterns")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handlePatternRoute(request, (service, ownerKey) =>
          service.listPatterns(params.id, ownerKey),
        ),
    },
  },
});
