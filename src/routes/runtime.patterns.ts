import { createFileRoute } from "@tanstack/react-router";
import { handlePatternRoute, readJsonBody } from "@/lib/patterns/http.server";

/** POST /runtime/patterns — run the Pattern Engine for an assessment. */
export const Route = createFileRoute("/runtime/patterns")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handlePatternRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
            regenerateRules?: boolean;
          }>(request);

          if (!body.assessmentId) {
            throw new service.PatternServiceError("assessmentId is required", 400);
          }

          return service.runPatterns(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
            regenerateRules: body.regenerateRules === true,
          });
        }),
    },
  },
});
