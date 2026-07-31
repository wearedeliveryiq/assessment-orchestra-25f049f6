import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import {
  createWorkspace,
  listWorkspaceTypes,
  listWorkspaces,
} from "@/lib/tenancy/workspace.server";

export const Route = createFileRoute("/api/workspaces")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const params = new URL(request.url).searchParams;
          const [workspaces, types] = await Promise.all([
            listWorkspaces(identity, {
              organisationId: params.get("organisationId") ?? undefined,
              query: params.get("q") ?? undefined,
              includeArchived: params.get("includeArchived") === "true",
            }),
            listWorkspaceTypes(),
          ]);
          return ok({ workspaces, types });
        }),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) =>
          ok(await createWorkspace(identity, (await readJson(request)) as never, ctx), 201),
        ),
    },
  },
});
