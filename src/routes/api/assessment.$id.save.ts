import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/save")({
  server: {
    handlers: {
      // POST — batch auto-save; also used by the browser unload beacon
      POST: async ({ request, params }) => {
        const { handleRuntimeRoute, readJson } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, async (api, ownerKey) => {
          const body = await readJson<{
            answers?: { questionId: string; value: unknown }[];
            currentPageId?: string | null;
          }>(request);
          return api.runtime.save(params.id, ownerKey, body as never);
        });
      },
    },
  },
});
