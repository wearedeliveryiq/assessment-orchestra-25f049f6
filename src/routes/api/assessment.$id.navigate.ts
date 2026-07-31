import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/$id/navigate")({
  server: {
    handlers: {
      // POST — previous / next / goto page / jump to section
      POST: async ({ request, params }) => {
        const { handleRuntimeRoute, readJson } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, async (api, ownerKey) => {
          const body = await readJson<{
            command: { direction: string; pageId?: string; sectionId?: string };
            answers?: { questionId: string; value: unknown }[];
          }>(request);
          return api.runtime.navigate(
            params.id,
            ownerKey,
            body.command as never,
            body.answers as never,
          );
        });
      },
    },
  },
});
