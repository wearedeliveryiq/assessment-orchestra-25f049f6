import { DashboardServiceError, getDashboard } from "../dashboard/service.server";
import type { DashboardPayload } from "../dashboard/types";
import { assembleReport } from "./assembler.server";
import { resolveBranding } from "./branding";
import { renderReport } from "./renderer.server";
import * as repository from "./repository.server";
import { downloadReport, storagePathFor, uploadReport } from "./storage.server";
import { getTemplate, isReportType, REPORT_TEMPLATES } from "./templates";
import { checksum, validateReport } from "./validator.server";
import {
  REPORT_CONTENT_TYPES,
  type Report,
  type ReportFormat,
  type ReportGenerationRequest,
  type ReportListPayload,
} from "./types";

/**
 * ReportGenerationService — the orchestration layer of the Report Engine.
 *
 * Lifecycle: `queued → generating → completed | failed`. Each state change is
 * persisted before the next step, so the client can poll progress and a failed
 * render can be retried by requesting the same report again — which produces a
 * new immutable version rather than mutating the old one.
 */

export class ReportServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ReportServiceError";
  }
}

const EXTENSIONS: Record<ReportFormat, string> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  json: "json",
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "assessment"
  );
}

function filenameFor(
  organisation: string,
  reportType: string,
  version: number,
  format: ReportFormat,
): string {
  return `deliveryiq-${slugify(organisation)}-${slugify(reportType)}-v${version}.${EXTENSIONS[format]}`;
}

async function loadPayload(assessmentId: string, ownerKey: string): Promise<DashboardPayload> {
  try {
    return await getDashboard(assessmentId, ownerKey);
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      throw new ReportServiceError(error.message, error.status);
    }
    throw error;
  }
}

/** List templates plus the immutable version history for one assessment. */
export async function listReports(
  assessmentId: string,
  ownerKey: string,
): Promise<ReportListPayload> {
  await loadPayload(assessmentId, ownerKey);
  await repository.expireStaleReports(assessmentId);
  return { templates: REPORT_TEMPLATES, reports: await repository.listReports(assessmentId) };
}

/** Render one queued report and persist the artefact. */
async function generate(report: Report, payload: DashboardPayload): Promise<Report> {
  const started = Date.now();
  const template = getTemplate(report.reportType);

  try {
    await repository.markGenerating(report.id);

    const document = assembleReport(
      payload,
      report.reportType,
      report.branding as Partial<Report["branding"]>,
      report.title,
    );
    const { bytes, contentType } = renderReport(document, report.format, template.includeToc);
    const validation = validateReport(document, payload, bytes.length);

    if (!validation.valid) {
      throw new Error(
        `Report validation failed: ${validation.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message)
          .join(" ")}`,
      );
    }

    const path = storagePathFor(report.sessionId, report.id, report.filename);
    await uploadReport(path, bytes, contentType);

    return await repository.markCompleted(report.id, {
      storagePath: path,
      fileSize: bytes.length,
      checksum: await checksum(bytes),
      durationMs: Date.now() - started,
      metadata: {
        ...report.metadata,
        facts: document.facts,
        sectionIds: document.sections.map((section) => section.id),
        sourceGeneratedAt: payload.generatedAt,
        assessmentStatus: payload.assessment.status,
      },
      validation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    console.error("[reports:generate]", report.id, message);
    return repository.markFailed(report.id, message, Date.now() - started);
  }
}

/**
 * Request a report. Records are created up-front in `queued` state and the
 * renders run afterwards, so a client that polls `GET /assessment/{id}/reports`
 * observes the full lifecycle.
 */
export async function requestReports(
  assessmentId: string,
  ownerKey: string,
  request: ReportGenerationRequest,
): Promise<Report[]> {
  if (!isReportType(request.reportType)) {
    throw new ReportServiceError(`Unknown report type "${request.reportType}"`, 400);
  }

  const template = getTemplate(request.reportType);
  const formats = (request.formats?.length ? request.formats : template.defaultFormats).filter(
    (format, index, all) => all.indexOf(format) === index,
  );

  const unsupported = formats.filter((format) => !template.formats.includes(format));
  if (unsupported.length > 0) {
    throw new ReportServiceError(
      `${template.name} cannot be rendered as ${unsupported.join(", ")}`,
      400,
    );
  }

  const payload = await loadPayload(assessmentId, ownerKey);
  const branding = resolveBranding(request.branding);

  const created: Report[] = [];
  for (const format of formats) {
    const version = await repository.nextVersion(assessmentId, request.reportType, format);
    created.push(
      await repository.createReport({
        sessionId: assessmentId,
        ownerKey,
        reportType: request.reportType,
        format,
        version,
        templateId: template.id,
        title: request.title?.trim().slice(0, 160) ?? "",
        knowledgePack: payload.knowledgePack.id,
        knowledgePackVersion: payload.knowledgePack.version,
        filename: filenameFor(payload.assessment.organisationName, request.reportType, version, format),
        contentType: REPORT_CONTENT_TYPES[format],
        branding,
        metadata: { sourceGeneratedAt: payload.generatedAt },
      }),
    );
  }

  const results: Report[] = [];
  for (const report of created) results.push(await generate(report, payload));
  return results;
}

/** Fetch one report record, scoped to the owner of its assessment. */
export async function getReport(reportId: string, ownerKey: string): Promise<Report> {
  const report = await repository.getReport(reportId);
  if (!report) throw new ReportServiceError("Report not found", 404);
  await loadPayload(report.sessionId, ownerKey);
  return report;
}

/** Fetch the stored artefact bytes for download. */
export async function downloadReportFile(
  reportId: string,
  ownerKey: string,
): Promise<{ report: Report; bytes: Uint8Array }> {
  const report = await getReport(reportId, ownerKey);
  if (report.status !== "completed" || !report.storagePath) {
    throw new ReportServiceError(`Report is ${report.status}; nothing to download yet`, 409);
  }
  return { report, bytes: await downloadReport(report.storagePath) };
}
