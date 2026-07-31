import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, originOf, readJson } from "@/lib/identity/http.server";
import { inviteMember } from "@/lib/tenancy/invitation.server";

export const Route = createFileRoute("/api/members/invite")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          const { invitation, token } = await inviteMember(identity, body, ctx);
          // The raw token is returned once so the inviter can share the link.
          return ok(
            { invitation, inviteUrl: `${originOf(request)}/auth/invitation?token=${token}` },
            201,
          );
        }),
    },
  },
});
