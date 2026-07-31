import { createFileRoute } from "@tanstack/react-router";

import { ok, readJson } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom, requireUuid } from "@/lib/reporting/http.server";
import { retryReport } from "@/lib/reporting/service.server";

export const Route = createFileRoute("/api/reporting/reports/$id/retry")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          return ok(
            await retryReport(
              identity,
              requireUuid(params.id, "report id"),
              organisationIdFrom(request, body),
            ),
          );
        }),
    },
  },
});
