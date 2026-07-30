import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/executions/$id/retry")({
  server: {
    handlers: {
      // POST — resumes a failed or cancelled execution without losing responses
      POST: async ({ request, params }) => {
        const { handleRoute, readJson , requireUuid } = await import("@/lib/orchestrator/http.server");
        const id = requireUuid(id);
        const body = await readJson<{ fromStart?: boolean }>(request);
        return handleRoute(request, (api, ownerKey) =>
          api.retry(id, ownerKey, { fromStart: body.fromStart === true }),
        );
      },
    },
  },
});
