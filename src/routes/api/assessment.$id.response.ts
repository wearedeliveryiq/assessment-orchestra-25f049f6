import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/response")({
  server: {
    handlers: {
      // POST — captures and validates a single answer
      POST: async ({ request, params }) => {
        const { handleRuntimeRoute, readJson } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, async (api, ownerKey) => {
          const body = await readJson<{ questionId: string; value: unknown }>(request);
          return api.runtime.answer(params.id, ownerKey, {
            questionId: body.questionId,
            value: body.value as never,
          });
        });
      },
    },
  },
});
