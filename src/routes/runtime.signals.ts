import { createFileRoute } from "@tanstack/react-router";
import { handleSignalRoute, readJsonBody } from "@/lib/signals/http.server";

/** POST /runtime/signals — run the Signal Engine for an assessment. */
export const Route = createFileRoute("/runtime/signals")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleSignalRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
            regenerateObservations?: boolean;
          }>(request);

          if (!body.assessmentId) {
            throw new service.SignalServiceError("assessmentId is required", 400);
          }

          return service.runSignals(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
            regenerateObservations: body.regenerateObservations === true,
          });
        }),
    },
  },
});
