import { DashboardServiceError, getDashboard } from "./service.server";
import { exportFilename, renderDeck, renderReportHtml } from "./export.server";
import type { DashboardExportFormat } from "./types";
import { assessmentOwnerId } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function failure(error: unknown): Response {
  if (error instanceof IdentityError) return json({ error: error.message }, error.status);
  if (error instanceof DashboardServiceError) return json({ error: error.message }, error.status);
  console.error("[dashboard-api]", error);
  return json({ error: "Dashboard service error" }, 500);
}

/** GET /assessment/{id}/dashboard — consolidated read model. */
export async function handleDashboardRoute(
  request: Request,
  assessmentId: string,
): Promise<Response> {
  try {
    const ownerKey = await assessmentOwnerId(request);
    return json(await getDashboard(assessmentId, ownerKey));
  } catch (error) {
    return failure(error);
  }
}

const FORMATS: DashboardExportFormat[] = ["json", "pdf", "pptx", "print"];

/** GET /assessment/{id}/export/{format} — backend-rendered exports. */
export async function handleDashboardExportRoute(
  request: Request,
  assessmentId: string,
  format: string,
): Promise<Response> {
  if (!FORMATS.includes(format as DashboardExportFormat)) {
    return json({ error: `Unsupported export format "${format}"` }, 400);
  }

  try {
    const ownerKey = await assessmentOwnerId(request);
    const payload = await getDashboard(assessmentId, ownerKey);

    if (format === "json") {
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${exportFilename(payload, "json")}"`,
          "cache-control": "no-store",
        },
      });
    }

    if (format === "pptx") {
      const deck = renderDeck(payload);
      return new Response(deck as unknown as BodyInit, {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "content-disposition": `attachment; filename="${exportFilename(payload, "pptx")}"`,
          "cache-control": "no-store",
        },
      });
    }

    // "pdf" and "print" share the print-ready report; "pdf" auto-opens the
    // browser print dialog so the user saves it as a PDF.
    return new Response(renderReportHtml(payload, format === "pdf"), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
