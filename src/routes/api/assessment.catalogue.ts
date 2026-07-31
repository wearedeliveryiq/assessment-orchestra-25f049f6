import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assessment/catalogue")({
  server: {
    handlers: {
      // GET — every knowledge pack the runtime can execute, plus the caller's sessions
      GET: async ({ request }) => {
        const { handleRuntimeRoute } = await import("@/lib/runtime/http.server");
        return handleRuntimeRoute(request, async (api, ownerKey) => ({
          assessments: api.catalogue(),
          sessions: await api.runtime.list(ownerKey),
        }));
      },
    },
  },
});
