import { createFileRoute } from "@tanstack/react-router";
import { handleObservationRoute, readJsonBody } from "@/lib/observations/http.server";

/** POST /runtime/observations — run the Observation Engine for an assessment. */
export const Route = createFileRoute("/runtime/observations")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleObservationRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
          }>(request);

          if (!body.assessmentId) {
            throw new service.ObservationServiceError("assessmentId is required", 400);
          }

          return service.runObservations(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
          });
        }),
    },
  },
});
