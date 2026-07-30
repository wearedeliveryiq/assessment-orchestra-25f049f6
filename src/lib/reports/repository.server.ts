/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  Report,
  ReportBranding,
  ReportFormat,
  ReportMetadata,
  ReportStatus,
  ReportType,
  ReportValidationResult,
} from "./types";

/**
 * ReportRepository — server-only persistence for report metadata.
 *
 * Reports are versioned and immutable: a new request never overwrites an
 * existing artefact, it inserts the next version for the (assessment, type,
 * format) triple. The only mutations permitted are the lifecycle transitions
 * of a report that has not completed yet.
 */
const sb = supabaseAdmin as unknown as { from: (table: string) => any };
const table = () => sb.from("assessment_reports");

type ReportRow = {
  id: string;
  session_id: string;
  owner_key: string;
  report_type: ReportType;
  format: ReportFormat;
  version: number;
  status: ReportStatus;
  template_id: string;
  title: string;
  knowledge_pack: string;
  knowledge_pack_version: string;
  filename: string;
  content_type: string;
  storage_path: string | null;
  file_size: number;
  checksum: string;
  branding: ReportBranding;
  metadata: ReportMetadata;
  validation: ReportValidationResult;
  error: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
  created_at: string;
  updated_at: string;
};

export function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    sessionId: row.session_id,
    reportType: row.report_type,
    format: row.format,
    version: row.version,
    status: row.status,
    templateId: row.template_id,
    title: row.title,
    knowledgePack: row.knowledge_pack,
    knowledgePackVersion: row.knowledge_pack_version,
    filename: row.filename,
    contentType: row.content_type,
    storagePath: row.storage_path,
    fileSize: Number(row.file_size ?? 0),
    checksum: row.checksum,
    branding: row.branding ?? {},
    metadata: row.metadata ?? {},
    validation: row.validation ?? {},
    error: row.error,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: Number(row.duration_ms ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function nextVersion(
  sessionId: string,
  reportType: ReportType,
  format: ReportFormat,
): Promise<number> {
  const { data, error } = await table()
    .select("version")
    .eq("session_id", sessionId)
    .eq("report_type", reportType)
    .eq("format", format)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to read report versions: ${error.message}`);
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1;
}

export interface CreateReportInput {
  sessionId: string;
  ownerKey: string;
  reportType: ReportType;
  format: ReportFormat;
  version: number;
  templateId: string;
  title: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  filename: string;
  contentType: string;
  branding: ReportBranding;
  metadata: ReportMetadata;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data, error } = await table()
    .insert({
      session_id: input.sessionId,
      owner_key: input.ownerKey,
      report_type: input.reportType,
      format: input.format,
      version: input.version,
      status: "queued",
      template_id: input.templateId,
      title: input.title,
      knowledge_pack: input.knowledgePack,
      knowledge_pack_version: input.knowledgePackVersion,
      filename: input.filename,
      content_type: input.contentType,
      branding: input.branding,
      metadata: input.metadata,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create report: ${error.message}`);
  return toReport(data as ReportRow);
}

async function patch(reportId: string, values: Record<string, unknown>): Promise<Report> {
  const { data, error } = await table().update(values).eq("id", reportId).select("*").single();
  if (error) throw new Error(`Failed to update report: ${error.message}`);
  return toReport(data as ReportRow);
}

export function markGenerating(reportId: string): Promise<Report> {
  return patch(reportId, { status: "generating", started_at: new Date().toISOString(), error: null });
}

export function markCompleted(
  reportId: string,
  values: {
    storagePath: string;
    fileSize: number;
    checksum: string;
    durationMs: number;
    metadata: ReportMetadata;
    validation: ReportValidationResult;
  },
): Promise<Report> {
  return patch(reportId, {
    status: "completed",
    storage_path: values.storagePath,
    file_size: values.fileSize,
    checksum: values.checksum,
    duration_ms: values.durationMs,
    metadata: values.metadata,
    validation: values.validation,
    completed_at: new Date().toISOString(),
    error: null,
  });
}

export function markFailed(reportId: string, message: string, durationMs: number): Promise<Report> {
  return patch(reportId, {
    status: "failed",
    error: message.slice(0, 2000),
    duration_ms: durationMs,
    completed_at: new Date().toISOString(),
  });
}

export async function listReports(sessionId: string): Promise<Report[]> {
  const { data, error } = await table()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list reports: ${error.message}`);
  return ((data ?? []) as ReportRow[]).map(toReport);
}

export async function getReport(reportId: string): Promise<Report | null> {
  const { data, error } = await table().select("*").eq("id", reportId).maybeSingle();
  if (error) throw new Error(`Failed to load report: ${error.message}`);
  return data ? toReport(data as ReportRow) : null;
}

/**
 * Recover reports abandoned by a terminated worker so the UI never shows a
 * permanently spinning row and the user can retry.
 */
export async function expireStaleReports(sessionId: string, olderThanMs = 120_000): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { error } = await table()
    .update({
      status: "failed",
      error: "Generation did not finish. Please retry.",
      completed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .in("status", ["queued", "generating"])
    .lt("requested_at", cutoff);
  if (error) console.error("[reports:expire]", error.message);
}
