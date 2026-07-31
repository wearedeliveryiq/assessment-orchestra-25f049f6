import { createFileRoute } from "@tanstack/react-router";

import { ok, readJson } from "@/lib/identity/http.server";
import { requireOrganisation, requireOrganisationAdmin } from "@/lib/tenancy/access.server";
import { loadBranding, saveBranding } from "@/lib/reporting/branding.server";
import { handleReportingRoute, organisationIdFrom } from "@/lib/reporting/http.server";
import type { ReportBranding } from "@/lib/reporting/types";

export const Route = createFileRoute("/api/reporting/branding")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const organisationId = organisationIdFrom(request);
          const access = await requireOrganisation(identity, organisationId);
          return ok(await loadBranding(access.organisation.id));
        }),

      PUT: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const organisationId = organisationIdFrom(request, body);
          const access = await requireOrganisationAdmin(identity, organisationId);
          return ok(
            await saveBranding(
              access.organisation.id,
              (body.branding as Partial<ReportBranding>) ?? {},
              identity.user.id,
            ),
          );
        }),
    },
  },
});
