import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id/retry")({
  server: {
    handlers: {
      // POST — resumes a failed or cancelled execution without losing responses
      POST: async ({ request, params }) => {
        const { handleRoute, readJson } = await import("@/lib/orchestrator/http.server");
        const body = await readJson<{ fromStart?: boolean }>(request);
        return handleRoute(request, (api, ownerKey) =>
          api.retry(params.id, ownerKey, { fromStart: body.fromStart === true }),
        );
      },
    },
  },
});
