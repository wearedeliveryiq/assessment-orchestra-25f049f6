import { createFileRoute } from "@tanstack/react-router";
import { handleRuleRoute, readJsonBody } from "@/lib/rules/http.server";

/** POST /runtime/rules — run the Rule Engine for an assessment. */
export const Route = createFileRoute("/runtime/rules")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleRuleRoute(request, async (service, ownerKey) => {
          const body = await readJsonBody<{
            assessmentId?: string;
            knowledgePack?: string;
            knowledgePackVersion?: string;
            regenerateSignals?: boolean;
          }>(request);

          if (!body.assessmentId) {
            throw new service.RuleServiceError("assessmentId is required", 400);
          }

          return service.runRules(body.assessmentId, ownerKey, {
            packId: body.knowledgePack,
            packVersion: body.knowledgePackVersion,
            regenerateSignals: body.regenerateSignals === true,
          });
        }),
    },
  },
});
