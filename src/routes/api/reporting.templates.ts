import { createFileRoute } from "@tanstack/react-router";

import { ok } from "@/lib/identity/http.server";
import { handleReportingRoute } from "@/lib/reporting/http.server";
import { listTemplates } from "@/lib/reporting/templates";
import { FUTURE_REPORT_FORMATS, REPORT_FORMATS } from "@/lib/reporting/types";

export const Route = createFileRoute("/api/reporting/templates")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async () =>
          ok({
            templates: listTemplates(),
            formats: REPORT_FORMATS,
            plannedFormats: FUTURE_REPORT_FORMATS,
          }),
        ),
    },
  },
});
