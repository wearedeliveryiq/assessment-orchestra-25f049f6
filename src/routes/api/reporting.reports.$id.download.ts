import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute } from "@/lib/identity/http.server";
import { organisationIdFrom, requireUuid } from "@/lib/reporting/http.server";
import { isReportingError } from "@/lib/reporting/errors";
import { downloadReport } from "@/lib/reporting/service.server";

/**
 * Streams the stored artefact. Ownership is re-checked here, so a download URL
 * is never a bearer of access on its own.
 */
export const Route = createFileRoute("/api/reporting/reports/$id/download")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          try {
            const { report, bytes } = await downloadReport(
              identity,
              requireUuid(params.id, "report id"),
              organisationIdFrom(request),
            );
            return new Response(bytes as unknown as BodyInit, {
              status: 200,
              headers: {
                "content-type": report.contentType,
                "content-length": String(bytes.byteLength),
                "content-disposition": `attachment; filename="${report.filename}"`,
                "cache-control": "private, no-store",
              },
            });
          } catch (error) {
            if (isReportingError(error)) {
              return new Response(JSON.stringify({ success: false, error: { code: error.code, message: error.message } }), {
                status: error.status,
                headers: { "content-type": "application/json; charset=utf-8" },
              });
            }
            throw error;
          }
        }),
    },
  },
});
