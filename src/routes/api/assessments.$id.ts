import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id")({
  server: {
    handlers: {
      // GET /api/assessments/:id — session plus saved responses
      GET: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, (rt, ownerKey) => rt.getAssessment(params.id, ownerKey));
      },
      // PUT /api/assessments/:id — save draft progress
      PUT: async ({ request, params }) => {
        const { handleRoute, readJson } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey) => {
          const body = await readJson<{
            answers?: { questionId: string; value: number | string | null; notes?: string | null }[];
            currentSection?: string | null;
            organisationName?: string;
            contactName?: string | null;
          }>(request);
          return rt.saveProgress(params.id, ownerKey, body);
        });
      },
      // DELETE /api/assessments/:id — archive (soft close) an assessment
      DELETE: async ({ request, params }) => {
        const { handleRoute } = await import("@/lib/assessment/http.server");
        return handleRoute(request, async (rt, ownerKey) => ({
          session: await rt.archiveAssessment(params.id, ownerKey),
        }));
      },
    },
  },
});
