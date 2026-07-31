import { createFileRoute } from "@tanstack/react-router";

import { ok } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom } from "@/lib/reporting/http.server";
import { getHistory } from "@/lib/reporting/service.server";

export const Route = createFileRoute("/api/reporting/history")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const search = new URL(request.url).searchParams;
          return ok(
            await getHistory(identity, organisationIdFrom(request), {
              reportId: search.get("reportId") ?? undefined,
              lineageId: search.get("lineageId") ?? undefined,
              limit: Number(search.get("limit") ?? 100),
            }),
          );
        }),
    },
  },
});
