import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments")({
  server: {
    handlers: {
      // GET /api/assessments — list every assessment for the caller
      GET: async ({ request }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey, context) => ({
          sessions: await rt.listAssessments(ownerKey, context),
        }));
      },
      // POST /api/assessments — create a new draft assessment
      POST: async ({ request }) => {
        const { handleRoute, readJson } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey, context) => {
          const body = await readJson<{
            organisationName?: string;
            contactName?: string | null;
            assessmentType?: string;
          }>(request);
          return {
            session: await rt.createAssessment({
              ownerKey,
              organisationId: context.organisationId,
              workspaceId: context.workspaceId,
              createdByUserId: context.identity.user.id,
              organisationName: body.organisationName ?? "",
              contactName: body.contactName ?? null,
              assessmentType: body.assessmentType,
            }),
          };
        });
      },
    },
  },
});
