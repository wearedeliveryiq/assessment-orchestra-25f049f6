import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/submit")({
  server: {
    handlers: {
      // POST — validates completeness, resets the pipeline and enters `processing`
      POST: async ({ request, params }) => {
        const { handleRoute, readOptionalJson } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey) => {
          const body = await readOptionalJson<{
            reviewAcknowledged?: boolean;
            missingAcknowledged?: boolean;
            evidenceRecencyDeclaration?: string;
            perspectiveBreadthDeclaration?: string;
          }>(request, {});
          return rt.submitAssessment(params.id, ownerKey, body);
        });
      },
    },
  },
});
