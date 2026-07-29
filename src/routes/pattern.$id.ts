import { createFileRoute } from "@tanstack/react-router";
import { handlePatternRoute } from "@/lib/patterns/http.server";

/** GET /pattern/{id} — pattern with its full traceability chain. */
export const Route = createFileRoute("/pattern/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handlePatternRoute(request, (service, ownerKey) =>
          service.getPatternTrace(params.id, ownerKey),
        ),
    },
  },
});
