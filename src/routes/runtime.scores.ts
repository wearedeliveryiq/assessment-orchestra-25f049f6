import { createFileRoute } from "@tanstack/react-router";
import { handleScoreRoute, readJsonBody } from "@/lib/scores/http.server";

/** POST /runtime/scores — run the Scoring Engine for an assessment. */
export const Route = createFileRoute("/runtime/scores")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleScoreRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
            regeneratePatterns?: boolean;
          }>(request);

          if (!body.assessmentId) {
            throw new service.ScoreServiceError("assessmentId is required", 400);
          }

          return service.runScores(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
            regeneratePatterns: body.regeneratePatterns === true,
          });
        }),
    },
  },
});
