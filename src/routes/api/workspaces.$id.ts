import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { readTenantAudit } from "@/lib/tenancy/audit.server";
import { getWorkspaceSettings } from "@/lib/tenancy/settings.server";
import {
  deleteWorkspace,
  getWorkspaceSummary,
  updateWorkspace,
} from "@/lib/tenancy/workspace.server";
import {
  listWorkspaceMembers,
  setWorkspaceFavourite,
} from "@/lib/tenancy/workspace-membership.server";

export const Route = createFileRoute("/api/workspaces/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const [workspace, members, settings, audit] = await Promise.all([
            getWorkspaceSummary(identity, params.id),
            listWorkspaceMembers(identity, params.id),
            getWorkspaceSettings(identity, params.id),
            readTenantAudit({ workspaceId: params.id, limit: 25 }).catch(() => []),
          ]);
          return ok({ workspace, members, settings, audit });
        }),
      PUT: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          if (typeof body.favourite === "boolean" && Object.keys(body).length === 1) {
            await setWorkspaceFavourite(identity, params.id, body.favourite);
            return ok(await getWorkspaceSummary(identity, params.id));
          }
          return ok(await updateWorkspace(identity, params.id, body as never, ctx));
        }),
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          await deleteWorkspace(identity, params.id, ctx);
          return ok({ deleted: true });
        }),
    },
  },
});
