import { createFileRoute } from "@tanstack/react-router";

import { ok, readJson } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom } from "@/lib/reporting/http.server";
import { getQueueSnapshot, processQueue } from "@/lib/reporting/service.server";

export const Route = createFileRoute("/api/reporting/queue")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) =>
          ok(await getQueueSnapshot(identity, organisationIdFrom(request))),
        ),

      // Drains queued exports. A future scheduler calls this endpoint too.
      POST: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const organisationId = organisationIdFrom(request, body);
          await getQueueSnapshot(identity, organisationId); // authorises the caller
          const limit = typeof body.limit === "number" ? Math.min(body.limit, 20) : 5;
          return ok(await processQueue(limit));
        }),
    },
  },
});
