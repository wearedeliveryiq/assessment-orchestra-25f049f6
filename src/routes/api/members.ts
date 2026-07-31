import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { listMembers } from "@/lib/tenancy/membership.server";

export const Route = createFileRoute("/api/members")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const params = new URL(request.url).searchParams;
          const organisationId = params.get("organisationId") ?? "";
          return ok(await listMembers(identity, organisationId, params.get("q") ?? undefined));
        }),
    },
  },
});
