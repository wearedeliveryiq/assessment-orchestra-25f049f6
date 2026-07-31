/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ReportingError } from "./errors";
import type {
  Report,
  ReportBranding,
  ReportDistributionTarget,
  ReportEvent,
  ReportEventType,
  ReportFilter,
  ReportFormat,
  ReportSchedule,
  ReportStatus,
  ReportType,
} from "./types";

/**
 * ReportRepository + ReportHistory persistence.
 *
 * Reports are versioned: regenerating never overwrites an artefact, it inserts
 * the next version sharing the original `lineage_id`. Every mutation is scoped
 * by `organisation_id` so tenant isolation is enforced in the data layer, not
 * only in the API layer.
 */

const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const reports = () => sb.from("platform_reports");
const events = () => sb.from("platform_report_events");

type Row = Record<string, any>;

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function toReport(row: Row): Report {
  const branding = jsonObject(row.branding);
  const schedule = jsonObject(row.schedule);
  return {
    id: row.id,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id ?? null,
    assessmentSessionId: row.assessment_session_id ?? null,
    sourceModule: row.source_module ?? "assessment",
    sourceId: row.source_id ?? null,
    reportType: row.report_type as ReportType,
    templateId: row.template_id,
    templateVersion: row.template_version,
    title: row.title,
    description: row.description ?? "",
    status: row.status as ReportStatus,
    version: Number(row.version ?? 1),
    lineageId: row.lineage_id,
    format: row.format as ReportFormat,
    contentType: row.content_type,
    filename: row.filename ?? "",
    storagePath: row.storage_path ?? null,
    checksum: row.checksum ?? "",
    fileSize: Number(row.file_size ?? 0),
    downloadCount: Number(row.download_count ?? 0),
    lastDownloadedAt: row.last_downloaded_at ?? null,
    generatedBy: row.generated_by ?? null,
    generatedByEmail: row.generated_by_email ?? "",
    generatedAt: row.generated_at ?? null,
    queuedAt: row.queued_at,
    startedAt: row.started_at ?? null,
    durationMs: Number(row.duration_ms ?? 0),
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? 3),
    expiresAt: row.expires_at ?? null,
    error: row.error ?? null,
    errorCode: row.error_code ?? null,
    branding: Object.keys(branding).length ? (branding as unknown as ReportBranding) : null,
    parameters: jsonObject(row.parameters),
    schedule: Object.keys(schedule).length ? (schedule as unknown as ReportSchedule) : null,
    distribution: Array.isArray(row.distribution) ? (row.distribution as ReportDistributionTarget[]) : [],
    metadata: jsonObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: Row): ReportEvent {
  return {
    id: row.id,
    reportId: row.report_id ?? null,
    lineageId: row.lineage_id ?? null,
    organisationId: row.organisation_id,
    workspaceId: row.workspace_id ?? null,
    eventType: row.event_type as ReportEventType,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? "",
    summary: row.summary ?? "",
    severity: (row.severity ?? "info") as ReportEvent["severity"],
    metadata: jsonObject(row.metadata),
    createdAt: row.created_at,
  };
}

function fail(message: string, error: { message?: string } | null): never {
  throw new ReportingError("storage_failed", message, 500, error?.message);
}

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

export interface InsertReportInput {
  organisationId: string;
  workspaceId: string | null;
  assessmentSessionId: string | null;
  sourceModule: string;
  sourceId: string | null;
  reportType: ReportType;
  templateId: string;
  templateVersion: string;
  title: string;
  description: string;
  format: ReportFormat;
  contentType: string;
  status: ReportStatus;
  version: number;
  lineageId: string;
  generatedBy: string | null;
  generatedByEmail: string;
  branding: ReportBranding;
  parameters: Record<string, unknown>;
  schedule: ReportSchedule | null;
  distribution: ReportDistributionTarget[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  maxAttempts?: number;
}

export async function insertReport(input: InsertReportInput): Promise<Report> {
  const { data, error } = await reports()
    .insert({
      organisation_id: input.organisationId,
      workspace_id: input.workspaceId,
      assessment_session_id: input.assessmentSessionId,
      source_module: input.sourceModule,
      source_id: input.sourceId,
      report_type: input.reportType,
      template_id: input.templateId,
      template_version: input.templateVersion,
      title: input.title,
      description: input.description,
      status: input.status,
      version: input.version,
      lineage_id: input.lineageId,
      format: input.format,
      content_type: input.contentType,
      generated_by: input.generatedBy,
      generated_by_email: input.generatedByEmail,
      branding: input.branding,
      parameters: input.parameters,
      schedule: input.schedule ?? {},
      distribution: input.distribution,
      metadata: input.metadata,
      expires_at: input.expiresAt,
      max_attempts: input.maxAttempts ?? 3,
      created_by: input.generatedBy,
      updated_by: input.generatedBy,
    })
    .select("*")
    .single();

  if (error || !data) fail("Could not create the report record.", error);
  return toReport(data);
}

export async function updateReport(
  id: string,
  organisationId: string,
  patch: Record<string, unknown>,
): Promise<Report> {
  const { data, error } = await reports()
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select("*")
    .single();

  if (error || !data) fail("Could not update the report record.", error);
  return toReport(data);
}

export async function findReport(id: string, organisationId: string): Promise<Report | null> {
  const { data, error } = await reports()
    .select("*")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) fail("Could not load the report.", error);
  return data ? toReport(data) : null;
}

export async function requireReport(id: string, organisationId: string): Promise<Report> {
  const report = await findReport(id, organisationId);
  if (!report) throw new ReportingError("not_found", "Report not found.", 404);
  return report;
}

export async function listReports(filter: ReportFilter): Promise<Report[]> {
  let query = reports().select("*").eq("is_deleted", false).order("created_at", { ascending: false });

  if (filter.organisationId) query = query.eq("organisation_id", filter.organisationId);
  if (filter.workspaceId) query = query.eq("workspace_id", filter.workspaceId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.reportType) query = query.eq("report_type", filter.reportType);
  if (filter.format) query = query.eq("format", filter.format);
  if (!filter.includeArchived) query = query.neq("status", "archived");
  if (filter.query?.trim()) {
    const term = filter.query.trim().replace(/[%,]/g, " ");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,filename.ilike.%${term}%`);
  }

  const { data, error } = await query.limit(Math.min(filter.limit ?? 100, 500));
  if (error) fail("Could not list reports.", error);
  return (data ?? []).map(toReport);
}

/** Every version of one report lineage, newest first. */
export async function listVersions(lineageId: string, organisationId: string): Promise<Report[]> {
  const { data, error } = await reports()
    .select("*")
    .eq("lineage_id", lineageId)
    .eq("organisation_id", organisationId)
    .eq("is_deleted", false)
    .order("version", { ascending: false });

  if (error) fail("Could not load report versions.", error);
  return (data ?? []).map(toReport);
}

export async function nextVersion(lineageId: string, organisationId: string): Promise<number> {
  const { data, error } = await reports()
    .select("version")
    .eq("lineage_id", lineageId)
    .eq("organisation_id", organisationId)
    .order("version", { ascending: false })
    .limit(1);

  if (error) fail("Could not determine the next report version.", error);
  return (data?.[0]?.version ?? 0) + 1;
}

/** Oldest queued reports first — the export queue is FIFO. */
export async function claimQueued(limit: number): Promise<Report[]> {
  const { data, error } = await reports()
    .select("*")
    .eq("status", "queued")
    .eq("is_deleted", false)
    .order("queued_at", { ascending: true })
    .limit(limit);

  if (error) fail("Could not read the export queue.", error);
  return (data ?? []).map(toReport);
}

export async function softDeleteReport(id: string, organisationId: string, actorId: string | null): Promise<void> {
  const { error } = await reports()
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (error) fail("Could not delete the report.", error);
}

export async function markDownloaded(report: Report): Promise<void> {
  const { error } = await reports()
    .update({
      download_count: report.downloadCount + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", report.id)
    .eq("organisation_id", report.organisationId);

  if (error) fail("Could not record the download.", error);
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

export interface RecordEventInput {
  reportId: string | null;
  lineageId: string | null;
  organisationId: string;
  workspaceId: string | null;
  eventType: ReportEventType;
  actorId: string | null;
  actorEmail: string;
  summary: string;
  severity?: ReportEvent["severity"];
  metadata?: Record<string, unknown>;
}

/** History is best-effort: an audit write must never fail a user's export. */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const { error } = await events().insert({
    report_id: input.reportId,
    lineage_id: input.lineageId,
    organisation_id: input.organisationId,
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    actor_id: input.actorId,
    actor_email: input.actorEmail,
    summary: input.summary,
    severity: input.severity ?? "info",
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[reporting] audit write failed", error.message);
}

export async function listEvents(
  organisationId: string,
  options: { reportId?: string; lineageId?: string; limit?: number } = {},
): Promise<ReportEvent[]> {
  let query = events()
    .select("*")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (options.reportId) query = query.eq("report_id", options.reportId);
  if (options.lineageId) query = query.eq("lineage_id", options.lineageId);

  const { data, error } = await query.limit(Math.min(options.limit ?? 100, 500));
  if (error) fail("Could not load report history.", error);
  return (data ?? []).map(toEvent);
}
