import { createFileRoute } from "@tanstack/react-router";
import { handleNarrativeRoute, readJsonBody } from "@/lib/narrative/http.server";

/** POST /runtime/narrative — run the Narrative Engine for an assessment. */
export const Route = createFileRoute("/runtime/narrative")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleNarrativeRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
            regenerateScores?: boolean;
          }>(request);

          if (!body.assessmentId) {
            throw new service.NarrativeServiceError("assessmentId is required", 400);
          }

          return service.runNarrative(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
            regenerateScores: body.regenerateScores === true,
          });
        }),
    },
  },
});
