import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, readJson } from "@/lib/identity/http.server";
import { isReportingError } from "@/lib/reporting/errors";
import { organisationIdFrom } from "@/lib/reporting/http.server";
import { previewDocument } from "@/lib/reporting/service.server";
import type { ReportDataset } from "@/lib/reporting/types";

/** Renders the print/preview layout as HTML without persisting an artefact. */
export const Route = createFileRoute("/api/reporting/preview")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          try {
            const html = await previewDocument(identity, {
              organisationId: organisationIdFrom(request, body),
              templateId: String(body.templateId ?? ""),
              dataset: (body.dataset as ReportDataset) ?? {},
              title: typeof body.title === "string" ? body.title : undefined,
              print: body.print === true,
            });
            return new Response(html, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
            });
          } catch (error) {
            if (isReportingError(error)) {
              return new Response(
                JSON.stringify({ success: false, error: { code: error.code, message: error.message } }),
                { status: error.status, headers: { "content-type": "application/json; charset=utf-8" } },
              );
            }
            throw error;
          }
        }),
    },
  },
});
