import { createFileRoute } from "@tanstack/react-router";
import { handleScoreRoute } from "@/lib/scores/http.server";

/** GET /score/{id} — score with its full traceability chain. */
export const Route = createFileRoute("/score/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleScoreRoute(request, (service, ownerKey) =>
          service.getScoreTrace(params.id, ownerKey),
        ),
    },
  },
});
