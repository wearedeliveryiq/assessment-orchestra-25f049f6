import {
  downloadReportFile,
  getReport,
  listReports,
  requestReports,
  ReportServiceError,
} from "./service.server";
import type { ReportFormat, ReportGenerationRequest } from "./types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function ownerKeyOf(request: Request): string | null {
  const header = request.headers.get("x-owner-key") ?? new URL(request.url).searchParams.get("k");
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return trimmed;
}

function failure(error: unknown): Response {
  if (error instanceof ReportServiceError) return json({ error: error.message }, error.status);
  console.error("[reports-api]", error);
  return json({ error: "Report service error" }, 500);
}

const FORMATS: ReportFormat[] = ["pdf", "docx", "pptx", "json"];

function parseRequest(body: unknown): ReportGenerationRequest {
  const input = (body ?? {}) as Record<string, unknown>;
  const formats = Array.isArray(input.formats)
    ? input.formats.filter((format): format is ReportFormat =>
        FORMATS.includes(format as ReportFormat),
      )
    : undefined;

  return {
    reportType: input.reportType as ReportGenerationRequest["reportType"],
    formats,
    title: typeof input.title === "string" ? input.title : undefined,
    branding:
      input.branding && typeof input.branding === "object"
        ? (input.branding as ReportGenerationRequest["branding"])
        : undefined,
  };
}

/** POST /assessment/{id}/reports — request an immutable report version. */
export async function handleCreateReportRoute(
  request: Request,
  assessmentId: string,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const reports = await requestReports(assessmentId, ownerKey, parseRequest(body));
    const failed = reports.filter((report) => report.status === "failed");
    return json({ reports }, failed.length === reports.length ? 500 : 202);
  } catch (error) {
    return failure(error);
  }
}

/** GET /assessment/{id}/reports — templates plus version history. */
export async function handleListReportsRoute(
  request: Request,
  assessmentId: string,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await listReports(assessmentId, ownerKey));
  } catch (error) {
    return failure(error);
  }
}

/** GET /report/{id} — one report record. */
export async function handleReportRoute(request: Request, reportId: string): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await getReport(reportId, ownerKey));
  } catch (error) {
    return failure(error);
  }
}

/** GET /report/{id}/download — stream the stored artefact. */
export async function handleReportDownloadRoute(
  request: Request,
  reportId: string,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    const { report, bytes } = await downloadReportFile(reportId, ownerKey);
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "content-type": report.contentType,
        "content-length": String(bytes.length),
        "content-disposition": `attachment; filename="${report.filename}"`,
        "x-report-checksum": report.checksum,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
