import { createFileRoute } from "@tanstack/react-router";
import { handleScoreRoute } from "@/lib/scores/http.server";

/** GET /assessment/{id}/scores */
export const Route = createFileRoute("/assessment/$id/scores")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleScoreRoute(request, (service, ownerKey) =>
          service.listScores(params.id, ownerKey),
        ),
    },
  },
});
