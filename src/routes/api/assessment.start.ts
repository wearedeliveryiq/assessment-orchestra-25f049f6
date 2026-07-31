import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/start")({
  server: {
    handlers: {
      // POST — creates a session, instance, response collection and progress tracker
      POST: async ({ request }) => {
        const { handleRuntimeRoute, readJson } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, async (api, ownerKey) => {
          const body = await readJson<{
            packId?: string;
            packVersion?: string;
            metadata?: Record<string, unknown>;
          }>(request);
          return api.runtime.start({ ownerKey, ...body });
        });
      },
    },
  },
});
