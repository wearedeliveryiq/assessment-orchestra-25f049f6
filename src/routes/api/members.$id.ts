import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { changeMemberRole, setMemberStatus } from "@/lib/tenancy/membership.server";
import { TenantErrors } from "@/lib/tenancy/roles";
import type { TenantMembershipStatus } from "@/lib/tenancy/types";

const STATUSES: TenantMembershipStatus[] = ["invited", "active", "suspended", "removed"];

export const Route = createFileRoute("/api/members/$id")({
  server: {
    handlers: {
      PUT: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          if (typeof body.status === "string") {
            const status = STATUSES.find((value) => value === body.status);
            if (!status) throw TenantErrors.validation("Unknown membership status.");
            return ok(await setMemberStatus(identity, params.id, status, ctx));
          }
          return ok(await changeMemberRole(identity, params.id, body.role, ctx));
        }),
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) =>
          ok(await setMemberStatus(identity, params.id, "removed", ctx)),
        ),
    },
  },
});
