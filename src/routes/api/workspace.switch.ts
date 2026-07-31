import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { switchWorkspace, workspaceContext } from "@/lib/tenancy/switch.server";

export const Route = createFileRoute("/api/workspace/switch")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => ok(await workspaceContext(identity))),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
          return ok(await switchWorkspace(identity, workspaceId, ctx));
        }),
    },
  },
});
