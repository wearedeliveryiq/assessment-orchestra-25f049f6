import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { listInvitations } from "@/lib/tenancy/invitation.server";
import { listMembers } from "@/lib/tenancy/membership.server";
import {
  archiveOrganisation,
  getOrganisationSummary,
  updateOrganisation,
} from "@/lib/tenancy/organisation.server";
import { readTenantAudit } from "@/lib/tenancy/audit.server";
import { listWorkspaces } from "@/lib/tenancy/workspace.server";

export const Route = createFileRoute("/api/organisations/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const [organisation, workspaces, members, invitations, audit] = await Promise.all([
            getOrganisationSummary(identity, params.id),
            listWorkspaces(identity, { organisationId: params.id, includeArchived: true }),
            listMembers(identity, params.id),
            listInvitations(identity, params.id).catch(() => []),
            readTenantAudit({ organisationId: params.id, limit: 25 }).catch(() => []),
          ]);
          return ok({ organisation, workspaces, members, invitations, audit });
        }),
      PUT: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) =>
          ok(await updateOrganisation(identity, params.id, (await readJson(request)) as never, ctx)),
        ),
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          await archiveOrganisation(identity, params.id, ctx);
          return ok({ archived: true });
        }),
    },
  },
});
