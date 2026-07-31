import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { requireOrganisation } from "@/lib/tenancy/access.server";

import { loadBranding } from "./branding.server";
import { composeDocument } from "./document";
import { dispatchDistribution } from "./distribution.server";
import { ReportingError, toReportingError } from "./errors";
import { canRetry, isExpired, hoursUntilExpiry, nextRunAt, summariseQueue } from "./queue";
import * as repo from "./repository.server";
import { renderDocument } from "./render/index.server";
import { downloadArtefact, removeArtefact, storagePathFor, uploadArtefact } from "./storage.server";
import { getTemplate, supportsFormat } from "./templates";
import {
  REPORT_CONTENT_TYPES,
  type CreateReportRequest,
  type DownloadCentreEntry,
  type DownloadCentrePayload,
  type Report,
  type ReportDataset,
  type ReportDetailPayload,
  type ReportFilter,
  type ReportFormat,
} from "./types";

/**
 * ReportService — the orchestration layer for the reporting framework.
 *
 * Responsibilities: authorise the caller against the tenant, resolve template
 * and branding, compose the document, render/store the artefact and record
 * history. Rendering, storage, templates and branding are all injected
 * collaborators, so a future module can swap any of them without touching this
 * file's control flow.
 */

interface Actor {
  id: string | null;
  email: string;
}

function actorOf(identity: AuthenticatedIdentity): Actor {
  return { id: identity.user.id, email: identity.user.email };
}

/** Datasets are persisted on the report so a queued or retried run can replay. */
function datasetOf(report: Report): ReportDataset {
  const stored = report.parameters?.dataset;
  return stored && typeof stored === "object" ? (stored as ReportDataset) : {};
}

function expiryFrom(days: number | undefined): string | null {
  if (!days || days <= 0) return null;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/* ------------------------------------------------------------------ *
 * Creation
 * ------------------------------------------------------------------ */

export async function createReport(
  identity: AuthenticatedIdentity,
  request: CreateReportRequest,
): Promise<Report> {
  const access = await requireOrganisation(identity, request.organisationId, { write: true });
  const actor = actorOf(identity);

  const template = getTemplate(request.templateId);
  if (!template) {
    throw new ReportingError("template_not_found", `Unknown report template: ${request.templateId}`, 404);
  }

  const format = request.format ?? template.defaultFormat;
  if (!supportsFormat(template, format)) {
    throw new ReportingError(
      "format_unsupported",
      `${template.name} cannot be exported as ${format.toUpperCase()}.`,
      422,
    );
  }

  const branding = await loadBranding(access.organisation.id);
  const dataset = request.dataset ?? {};
  const title = request.title?.trim() || `${template.name} — ${access.organisation.name}`;
  const lineageId = crypto.randomUUID();

  const report = await repo.insertReport({
    organisationId: access.organisation.id,
    workspaceId: request.workspaceId ?? null,
    assessmentSessionId: request.assessmentSessionId ?? null,
    sourceModule: request.sourceModule ?? "platform",
    sourceId: request.sourceId ?? null,
    reportType: template.category,
    templateId: template.id,
    templateVersion: template.version,
    title,
    description: request.description ?? template.description,
    format,
    contentType: REPORT_CONTENT_TYPES[format],
    status: "queued",
    version: 1,
    lineageId,
    generatedBy: actor.id,
    generatedByEmail: actor.email,
    branding,
    parameters: { ...(request.parameters ?? {}), dataset },
    schedule: request.schedule
      ? { ...request.schedule, nextRunAt: nextRunAt(request.schedule) }
      : null,
    distribution: request.distribution ?? [],
    metadata: {},
    expiresAt: expiryFrom(request.expiresInDays),
  });

  await repo.recordEvent({
    reportId: report.id,
    lineageId: report.lineageId,
    organisationId: report.organisationId,
    workspaceId: report.workspaceId,
    eventType: "report.requested",
    actorId: actor.id,
    actorEmail: actor.email,
    summary: `${title} requested as ${format.toUpperCase()}.`,
    metadata: { templateId: template.id, format },
  });

  // Async requests stay queued for `processQueue`; the default renders inline
  // so a user pressing "Export" gets a file back in the same request.
  return request.async ? report : generateReport(report);
}

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

export async function generateReport(input: Report): Promise<Report> {
  const startedAt = Date.now();
  let report = await repo.updateReport(input.id, input.organisationId, {
    status: "generating",
    started_at: new Date().toISOString(),
    attempts: input.attempts + 1,
    error: null,
    error_code: null,
  });

  await repo.recordEvent({
    reportId: report.id,
    lineageId: report.lineageId,
    organisationId: report.organisationId,
    workspaceId: report.workspaceId,
    eventType: "report.generating",
    actorId: report.generatedBy,
    actorEmail: report.generatedByEmail,
    summary: `Generation started (attempt ${report.attempts}).`,
  });

  try {
    const template = getTemplate(report.templateId);
    if (!template) {
      throw new ReportingError("template_not_found", `Unknown report template: ${report.templateId}`, 404);
    }

    const document = composeDocument(template, datasetOf(report), {
      title: report.title,
      subtitle: report.description,
      organisation: String(report.parameters.organisationName ?? report.title),
      workspace: String(report.parameters.workspaceName ?? ""),
      generatedAt: new Date().toISOString(),
      generatedBy: report.generatedByEmail || "DeliveryIQ",
      version: report.version,
      branding: report.branding,
    });

    const artefact = await renderDocument(document, report.format, { version: report.version });
    const path = storagePathFor(report.organisationId, report.id, artefact.filename);
    await uploadArtefact(path, artefact.bytes, artefact.contentType);

    report = await repo.updateReport(report.id, report.organisationId, {
      status: "completed",
      storage_path: path,
      filename: artefact.filename,
      content_type: artefact.contentType,
      checksum: artefact.checksum,
      file_size: artefact.byteLength,
      generated_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });

    await repo.recordEvent({
      reportId: report.id,
      lineageId: report.lineageId,
      organisationId: report.organisationId,
      workspaceId: report.workspaceId,
      eventType: "report.generated",
      actorId: report.generatedBy,
      actorEmail: report.generatedByEmail,
      summary: `${report.title} generated as ${report.format.toUpperCase()} (${artefact.byteLength} bytes).`,
      metadata: { checksum: artefact.checksum, durationMs: report.durationMs },
    });

    if (report.distribution.length) await dispatchDistribution(report);

    return report;
  } catch (error) {
    const failure = toReportingError(error);
    const failed = await repo.updateReport(report.id, report.organisationId, {
      status: "failed",
      error: failure.message,
      error_code: failure.code,
      duration_ms: Date.now() - startedAt,
    });

    await repo.recordEvent({
      reportId: failed.id,
      lineageId: failed.lineageId,
      organisationId: failed.organisationId,
      workspaceId: failed.workspaceId,
      eventType: "report.failed",
      actorId: failed.generatedBy,
      actorEmail: failed.generatedByEmail,
      severity: "error",
      summary: `Generation failed: ${failure.message}`,
      metadata: { code: failure.code, attempt: failed.attempts },
    });

    throw failure;
  }
}

/** Create the next version of an existing report, reusing its stored dataset. */
export async function regenerateReport(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
  overrides: { format?: ReportFormat; dataset?: ReportDataset } = {},
): Promise<Report> {
  const access = await requireOrganisation(identity, organisationId, { write: true });
  const previous = await repo.requireReport(reportId, access.organisation.id);
  const actor = actorOf(identity);

  const template = getTemplate(previous.templateId);
  if (!template) {
    throw new ReportingError("template_not_found", `Unknown report template: ${previous.templateId}`, 404);
  }

  const format = overrides.format ?? previous.format;
  if (!supportsFormat(template, format)) {
    throw new ReportingError(
      "format_unsupported",
      `${template.name} cannot be exported as ${format.toUpperCase()}.`,
      422,
    );
  }

  const version = await repo.nextVersion(previous.lineageId, access.organisation.id);
  const branding = await loadBranding(access.organisation.id);

  const created = await repo.insertReport({
    organisationId: access.organisation.id,
    workspaceId: previous.workspaceId,
    assessmentSessionId: previous.assessmentSessionId,
    sourceModule: previous.sourceModule,
    sourceId: previous.sourceId,
    reportType: template.category,
    templateId: template.id,
    // A regenerated report picks up the current template version — recorded so
    // the history explains why two versions can look different.
    templateVersion: template.version,
    title: previous.title,
    description: previous.description,
    format,
    contentType: REPORT_CONTENT_TYPES[format],
    status: "queued",
    version,
    lineageId: previous.lineageId,
    generatedBy: actor.id,
    generatedByEmail: actor.email,
    branding,
    parameters: {
      ...previous.parameters,
      dataset: overrides.dataset ?? datasetOf(previous),
    },
    schedule: previous.schedule,
    distribution: previous.distribution,
    metadata: { ...previous.metadata, regeneratedFrom: previous.id },
    expiresAt: previous.expiresAt,
    maxAttempts: previous.maxAttempts,
  });

  await repo.recordEvent({
    reportId: created.id,
    lineageId: created.lineageId,
    organisationId: created.organisationId,
    workspaceId: created.workspaceId,
    eventType: "report.regenerated",
    actorId: actor.id,
    actorEmail: actor.email,
    summary: `Version ${version} requested from version ${previous.version}.`,
    metadata: {
      previousReportId: previous.id,
      previousTemplateVersion: previous.templateVersion,
      templateVersion: template.version,
    },
  });

  return generateReport(created);
}

/** Retry a failed report in place (attempt budget enforced). */
export async function retryReport(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
): Promise<Report> {
  const access = await requireOrganisation(identity, organisationId, { write: true });
  const report = await repo.requireReport(reportId, access.organisation.id);
  if (!canRetry(report)) {
    throw new ReportingError("invalid_request", "This report cannot be retried.", 409);
  }
  return generateReport(report);
}

/** Drain queued exports — invoked by the queue endpoint or a scheduler. */
export async function processQueue(limit = 5): Promise<{ processed: number; failed: number }> {
  const queued = await repo.claimQueued(limit);
  let failed = 0;
  for (const report of queued) {
    try {
      await generateReport(report);
    } catch {
      failed += 1;
    }
  }
  return { processed: queued.length, failed };
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export async function listOrganisationReports(
  identity: AuthenticatedIdentity,
  filter: ReportFilter & { organisationId: string },
): Promise<Report[]> {
  const access = await requireOrganisation(identity, filter.organisationId);
  return repo.listReports({ ...filter, organisationId: access.organisation.id });
}

export async function getReportDetail(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
): Promise<ReportDetailPayload> {
  const access = await requireOrganisation(identity, organisationId);
  const report = await repo.requireReport(reportId, access.organisation.id);
  const [versions, history] = await Promise.all([
    repo.listVersions(report.lineageId, access.organisation.id),
    repo.listEvents(access.organisation.id, { lineageId: report.lineageId, limit: 100 }),
  ]);
  return { report, template: getTemplate(report.templateId), versions, history };
}

function toEntry(report: Report): DownloadCentreEntry {
  const expired = isExpired(report);
  const available = report.status === "completed" && !expired && Boolean(report.storagePath);
  return {
    report,
    available,
    expired,
    expiresInHours: hoursUntilExpiry(report),
    downloadUrl: available
      ? `/api/reporting/reports/${report.id}/download?organisationId=${report.organisationId}`
      : null,
  };
}

export async function getDownloadCentre(
  identity: AuthenticatedIdentity,
  organisationId: string,
  filter: Omit<ReportFilter, "organisationId"> = {},
): Promise<DownloadCentrePayload> {
  const access = await requireOrganisation(identity, organisationId);
  const reports = await repo.listReports({
    ...filter,
    organisationId: access.organisation.id,
    limit: filter.limit ?? 200,
  });
  const entries = reports.map(toEntry);

  return {
    available: entries.filter((entry) => entry.available),
    queue: entries.filter(
      (entry) => entry.report.status === "queued" || entry.report.status === "generating" || entry.report.status === "failed",
    ),
    expired: entries.filter((entry) => entry.expired || (entry.report.status === "completed" && !entry.available)),
    generatedAt: new Date().toISOString(),
  };
}

export async function getQueueSnapshot(identity: AuthenticatedIdentity, organisationId: string) {
  const access = await requireOrganisation(identity, organisationId);
  const reports = await repo.listReports({ organisationId: access.organisation.id, limit: 500 });
  return summariseQueue(reports);
}

/* ------------------------------------------------------------------ *
 * Download, delete, archive
 * ------------------------------------------------------------------ */

export interface DownloadPayload {
  report: Report;
  bytes: Uint8Array;
}

export async function downloadReport(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
): Promise<DownloadPayload> {
  const access = await requireOrganisation(identity, organisationId);
  const report = await repo.requireReport(reportId, access.organisation.id);

  if (report.status !== "completed" || !report.storagePath) {
    throw new ReportingError("invalid_request", "This report is not ready to download.", 409);
  }
  if (isExpired(report)) {
    throw new ReportingError("expired", "This report has expired. Generate a new version.", 410);
  }

  const bytes = await downloadArtefact(report.storagePath);
  await repo.markDownloaded(report);
  await repo.recordEvent({
    reportId: report.id,
    lineageId: report.lineageId,
    organisationId: report.organisationId,
    workspaceId: report.workspaceId,
    eventType: "report.downloaded",
    actorId: identity.user.id,
    actorEmail: identity.user.email,
    summary: `${report.filename} downloaded.`,
  });

  return { report, bytes };
}

export async function archiveReport(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
): Promise<Report> {
  const access = await requireOrganisation(identity, organisationId, { write: true });
  const report = await repo.requireReport(reportId, access.organisation.id);
  const archived = await repo.updateReport(report.id, report.organisationId, { status: "archived" });

  await repo.recordEvent({
    reportId: report.id,
    lineageId: report.lineageId,
    organisationId: report.organisationId,
    workspaceId: report.workspaceId,
    eventType: "report.archived",
    actorId: identity.user.id,
    actorEmail: identity.user.email,
    summary: `${report.title} archived.`,
  });

  return archived;
}

export async function deleteReport(
  identity: AuthenticatedIdentity,
  reportId: string,
  organisationId: string,
): Promise<void> {
  const access = await requireOrganisation(identity, organisationId, { write: true });
  const report = await repo.requireReport(reportId, access.organisation.id);

  await repo.softDeleteReport(report.id, report.organisationId, identity.user.id);
  if (report.storagePath) await removeArtefact(report.storagePath);

  await repo.recordEvent({
    reportId: report.id,
    lineageId: report.lineageId,
    organisationId: report.organisationId,
    workspaceId: report.workspaceId,
    eventType: "report.deleted",
    actorId: identity.user.id,
    actorEmail: identity.user.email,
    severity: "warning",
    summary: `${report.title} deleted.`,
  });
}

export async function getHistory(
  identity: AuthenticatedIdentity,
  organisationId: string,
  options: { reportId?: string; lineageId?: string; limit?: number } = {},
) {
  const access = await requireOrganisation(identity, organisationId);
  return repo.listEvents(access.organisation.id, options);
}

/** Preview HTML without persisting anything — used by the print/preview route. */
export async function previewDocument(
  identity: AuthenticatedIdentity,
  input: { organisationId: string; templateId: string; dataset?: ReportDataset; title?: string; print?: boolean },
): Promise<string> {
  const access = await requireOrganisation(identity, input.organisationId);
  const template = getTemplate(input.templateId);
  if (!template) {
    throw new ReportingError("template_not_found", `Unknown report template: ${input.templateId}`, 404);
  }

  const branding = await loadBranding(access.organisation.id);
  const document = composeDocument(template, input.dataset ?? {}, {
    title: input.title,
    organisation: access.organisation.name,
    generatedBy: identity.user.email,
    branding,
  });

  const { renderHtmlDocument } = await import("./render/html");
  return renderHtmlDocument(document, { print: input.print });
}
