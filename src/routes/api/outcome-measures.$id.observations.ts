import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/outcome-measures/$id/observations")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getOutcomeObservations } =
          await import("@/lib/recommendation-outcomes/http.server");
        return getOutcomeObservations(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postOutcomeObservation } =
          await import("@/lib/recommendation-outcomes/http.server");
        return postOutcomeObservation(request, params.id);
      },
    },
  },
});
