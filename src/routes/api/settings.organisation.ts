import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import {
  getOrganisationSettings,
  updateOrganisationSettings,
} from "@/lib/tenancy/settings.server";

export const Route = createFileRoute("/api/settings/organisation")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const organisationId =
            new URL(request.url).searchParams.get("organisationId") ?? "";
          return ok(await getOrganisationSettings(identity, organisationId));
        }),
      PUT: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity, ctx }) => {
          const body = await readJson(request);
          const organisationId =
            typeof body.organisationId === "string" ? body.organisationId : "";
          return ok(await updateOrganisationSettings(identity, organisationId, body, ctx));
        }),
    },
  },
});
