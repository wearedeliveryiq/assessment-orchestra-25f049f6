import { createFileRoute } from "@tanstack/react-router";

import { ok } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom } from "@/lib/reporting/http.server";
import { getDownloadCentre } from "@/lib/reporting/service.server";
import type { ReportFormat, ReportType } from "@/lib/reporting/types";

export const Route = createFileRoute("/api/reporting/download-centre")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const search = new URL(request.url).searchParams;
          return ok(
            await getDownloadCentre(identity, organisationIdFrom(request), {
              workspaceId: search.get("workspaceId") ?? undefined,
              reportType: (search.get("reportType") as ReportType | null) ?? undefined,
              format: (search.get("format") as ReportFormat | null) ?? undefined,
              query: search.get("query") ?? undefined,
              includeArchived: search.get("includeArchived") === "true",
            }),
          );
        }),
    },
  },
});
