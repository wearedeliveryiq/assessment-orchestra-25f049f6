import { createFileRoute } from "@tanstack/react-router";

import { ok } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom, requireUuid } from "@/lib/reporting/http.server";
import { deleteReport, getReportDetail } from "@/lib/reporting/service.server";

export const Route = createFileRoute("/api/reporting/reports/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleReportingRoute(request, async ({ identity }) =>
          ok(
            await getReportDetail(
              identity,
              requireUuid(params.id, "report id"),
              organisationIdFrom(request),
            ),
          ),
        ),

      DELETE: async ({ request, params }) =>
        handleReportingRoute(request, async ({ identity }) => {
          await deleteReport(identity, requireUuid(params.id, "report id"), organisationIdFrom(request));
          return ok({ deleted: true });
        }),
    },
  },
});
