import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessments/$id/execute")({
  server: {
    handlers: {
      // POST — queues an Intelligence Runtime execution for the assessment
      POST: async ({ request, params }) => {
        const { handleRoute, readJson, parseMode } = await import(
          "@/lib/orchestrator/http.server"
        );
        const body = await readJson<{ mode?: string; metadata?: Record<string, unknown> }>(
          request,
        );
        return handleRoute(request, (api, ownerKey) =>
          api.execute(requireUuid(params.id), ownerKey, {
            mode: parseMode(body.mode),
            metadata: body.metadata,
          }),
        );
      },
      // GET — latest execution for this assessment
      GET: async ({ request, params }) => {
        const { handleRoute , requireUuid } = await import("@/lib/orchestrator/http.server");
        return handleRoute(request, (api, ownerKey) =>
          api.latestForSession(requireUuid(params.id), ownerKey),
        );
      },
    },
  },
});
