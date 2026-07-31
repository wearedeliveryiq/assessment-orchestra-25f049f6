import { createFileRoute } from "@tanstack/react-router";

import { ok, readJson } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom, requireUuid } from "@/lib/reporting/http.server";
import { regenerateReport } from "@/lib/reporting/service.server";
import type { ReportDataset, ReportFormat } from "@/lib/reporting/types";

export const Route = createFileRoute("/api/reporting/reports/$id/regenerate")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          return ok(
            await regenerateReport(
              identity,
              requireUuid(params.id, "report id"),
              organisationIdFrom(request, body),
              {
                format: (body.format as ReportFormat | undefined) ?? undefined,
                dataset: (body.dataset as ReportDataset | undefined) ?? undefined,
              },
            ),
            201,
          );
        }),
    },
  },
});
