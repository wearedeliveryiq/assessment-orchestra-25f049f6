import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { createOrganisation, listOrganisations } from "@/lib/tenancy/organisation.server";

export const Route = createFileRoute("/api/organisations")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const query = new URL(request.url).searchParams.get("q") ?? undefined;
          return ok(await listOrganisations(identity, query));
        }),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) =>
          ok(await createOrganisation(identity, (await readJson(request)) as never, ctx), 201),
        ),
    },
  },
});
