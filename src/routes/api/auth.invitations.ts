import { createFileRoute } from "@tanstack/react-router";

import { inviteMember, listOrganisationInvitations } from "@/lib/identity/service.server";
import { failure, handleProtectedRoute, ok, originOf, readJson } from "@/lib/identity/http.server";

export const Route = createFileRoute("/api/auth/invitations")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const organisationId = new URL(request.url).searchParams.get("organisationId");
          if (!organisationId) {
            return failure("validation_failed", "An organisation is required.", 400);
          }
          return ok(await listOrganisationInvitations(identity, organisationId));
        }),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          if (typeof body.organisationId !== "string" || typeof body.email !== "string") {
            return failure("validation_failed", "An organisation and email are required.", 400);
          }
          const { invitation, token } = await inviteMember(
            { organisationId: body.organisationId, email: body.email, role: body.role },
            ctx,
          );
          return ok(
            { invitation, inviteUrl: `${originOf(request)}/auth/invitation?token=${token}` },
            201,
          );
        }),
    },
  },
});
