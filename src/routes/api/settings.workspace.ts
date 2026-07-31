import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/tenancy/settings.server";

export const Route = createFileRoute("/api/settings/workspace")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
          return ok(await getWorkspaceSettings(identity, workspaceId));
        }),
      PUT: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
          return ok(await updateWorkspaceSettings(identity, workspaceId, body, ctx));
        }),
    },
  },
});
