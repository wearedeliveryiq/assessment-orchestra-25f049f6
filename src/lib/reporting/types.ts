/**
 * Reporting & Export Foundation — client-safe contracts.
 *
 * This module is a *platform capability*: it renders, exports, stores and
 * distributes documents. It never calculates scores, signals, patterns,
 * recommendations or narratives — callers supply a `ReportDataset` and the
 * framework turns it into artefacts using a metadata-driven template.
 */

/* ------------------------------------------------------------------ *
 * Formats
 * ------------------------------------------------------------------ */

/** Formats the export pipeline can render today. */
export type ReportFormat = "pdf" | "docx" | "xlsx" | "html" | "print";

/** Declared now, rendered later — the pipeline rejects them with a clear code. */
export type FutureReportFormat = "pptx" | "json" | "csv";

export type AnyReportFormat = ReportFormat | FutureReportFormat;

export const REPORT_FORMATS: ReportFormat[] = ["pdf", "docx", "xlsx", "html", "print"];

export const FUTURE_REPORT_FORMATS: FutureReportFormat[] = ["pptx", "json", "csv"];

export const REPORT_FORMAT_LABELS: Record<AnyReportFormat, string> = {
  pdf: "PDF",
  docx: "Word",
  xlsx: "Excel",
  html: "HTML",
  print: "Print",
  pptx: "PowerPoint",
  json: "JSON",
  csv: "CSV",
};

export const REPORT_CONTENT_TYPES: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  html: "text/html; charset=utf-8",
  print: "text/html; charset=utf-8",
};

export const REPORT_FILE_EXTENSIONS: Record<ReportFormat, string> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  html: "html",
  print: "print.html",
};

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

export type ReportStatus = "queued" | "generating" | "completed" | "failed" | "archived";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  queued: "Queued",
  generating: "Generating",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

export type ReportTemplateCategory =
  | "executive-summary"
  | "assessment-summary"
  | "detailed-report"
  | "operational-report"
  | "management-report"
  | "custom";

export type ReportTemplateStatus = "draft" | "published" | "deprecated";

/** The report type is the template category a caller asks for. */
export type ReportType = ReportTemplateCategory;

/**
 * Block specifications are declarative: they name where their content comes
 * from inside the supplied dataset, never how it was calculated.
 */
export type ReportBlockSpec =
  | { kind: "paragraph"; source: string; fallback?: string }
  | { kind: "richtext"; source: string; fallback?: string }
  | { kind: "bullets"; source: string; limit?: number }
  | { kind: "kpis"; source: string; labelKey?: string; valueKey?: string }
  | {
      kind: "table";
      source: string;
      columns: { key: string; label: string; width?: number }[];
      limit?: number;
    }
  | { kind: "chart"; source: string; chartType: "bar" | "line" | "donut"; caption?: string }
  | { kind: "image"; source: string; caption?: string }
  | { kind: "note"; text: string }
  | { kind: "pagebreak" };

export interface ReportLayoutSection {
  id: string;
  title: string;
  /** Excluded from the table of contents when false. */
  listed?: boolean;
  /** Rendered as an appendix (after the main body, numbered separately). */
  appendix?: boolean;
  /** Skip the section entirely when this dataset key resolves to nothing. */
  requires?: string;
  blocks: ReportBlockSpec[];
}

export interface ReportLayout {
  orientation: "portrait" | "landscape";
  includeCover: boolean;
  includeToc: boolean;
  pageNumbering: boolean;
  headerText?: string;
  footerText?: string;
  sections: ReportLayoutSection[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportTemplateCategory;
  version: string;
  status: ReportTemplateStatus;
  /** Branding profile key; `organisation` resolves the tenant's own profile. */
  brandingProfile: string;
  formats: ReportFormat[];
  defaultFormat: ReportFormat;
  layout: ReportLayout;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Branding
 * ------------------------------------------------------------------ */

export interface ReportBranding {
  productName: string;
  logoText: string;
  logoUrl: string | null;
  /** Hex colours without the leading `#`. */
  primaryColour: string;
  secondaryColour: string;
  inkColour: string;
  mutedColour: string;
  surfaceColour: string;
  headingFont: string;
  bodyFont: string;
  headerText: string;
  footerText: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  confidentialityStatement: string;
}

/* ------------------------------------------------------------------ *
 * Dataset + resolved document model
 * ------------------------------------------------------------------ */

/** Whatever the calling module supplies. The framework only reads it. */
export type ReportDataset = Record<string, unknown>;

export type ReportRenderBlock =
  | { kind: "heading"; text: string; level: 2 | 3 }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "kpis"; items: { label: string; value: string }[] }
  | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[] }
  | {
      kind: "chart";
      chartType: "bar" | "line" | "donut";
      caption: string;
      series: { label: string; value: number }[];
    }
  | { kind: "image"; url: string; caption: string; alt: string }
  | { kind: "note"; text: string }
  | { kind: "pagebreak" };

export interface ReportDocumentSection {
  id: string;
  title: string;
  listed: boolean;
  appendix: boolean;
  blocks: ReportRenderBlock[];
}

export interface ReportDocumentCover {
  title: string;
  subtitle: string;
  organisation: string;
  workspace: string;
  generatedAt: string;
  generatedBy: string;
  version: number;
  templateName: string;
}

export interface ReportDocument {
  reportType: ReportType;
  templateId: string;
  templateVersion: string;
  title: string;
  branding: ReportBranding;
  cover: ReportDocumentCover;
  includeCover: boolean;
  includeToc: boolean;
  pageNumbering: boolean;
  headerText: string;
  footerText: string;
  sections: ReportDocumentSection[];
}

export interface RenderedArtefact {
  format: ReportFormat;
  bytes: Uint8Array;
  contentType: string;
  filename: string;
  checksum: string;
  byteLength: number;
}

/* ------------------------------------------------------------------ *
 * Scheduling + distribution (extension points only)
 * ------------------------------------------------------------------ */

export interface ReportSchedule {
  enabled: boolean;
  frequency: "once" | "daily" | "weekly" | "monthly" | "quarterly";
  timezone: string;
  recipients: string[];
  deliveryMethod: ReportDistributionChannel;
  nextRunAt?: string | null;
}

export type ReportDistributionChannel =
  | "download"
  | "email"
  | "microsoft-teams"
  | "slack"
  | "sharepoint"
  | "object-storage";

export interface ReportDistributionTarget {
  channel: ReportDistributionChannel;
  address: string;
  configuration?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * Report entity
 * ------------------------------------------------------------------ */

export interface Report {
  id: string;
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
  status: ReportStatus;
  version: number;
  /** Stable identifier shared by every version of the same report. */
  lineageId: string;
  format: ReportFormat;
  contentType: string;
  filename: string;
  storagePath: string | null;
  checksum: string;
  fileSize: number;
  downloadCount: number;
  lastDownloadedAt: string | null;
  generatedBy: string | null;
  generatedByEmail: string;
  generatedAt: string | null;
  queuedAt: string;
  startedAt: string | null;
  durationMs: number;
  attempts: number;
  maxAttempts: number;
  expiresAt: string | null;
  error: string | null;
  errorCode: string | null;
  branding: ReportBranding | null;
  parameters: Record<string, unknown>;
  schedule: ReportSchedule | null;
  distribution: ReportDistributionTarget[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ReportEventType =
  | "report.requested"
  | "report.queued"
  | "report.generating"
  | "report.generated"
  | "report.failed"
  | "report.downloaded"
  | "report.deleted"
  | "report.regenerated"
  | "report.archived"
  | "report.expired"
  | "template.changed";

export interface ReportEvent {
  id: string;
  reportId: string | null;
  lineageId: string | null;
  organisationId: string;
  workspaceId: string | null;
  eventType: ReportEventType;
  actorId: string | null;
  actorEmail: string;
  summary: string;
  severity: "info" | "warning" | "error";
  metadata: Record<string, unknown>;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * API contracts
 * ------------------------------------------------------------------ */

export interface CreateReportRequest {
  organisationId: string;
  workspaceId?: string | null;
  templateId: string;
  format?: ReportFormat;
  title?: string;
  description?: string;
  assessmentSessionId?: string | null;
  sourceModule?: string;
  sourceId?: string | null;
  parameters?: Record<string, unknown>;
  /** Data to render. Supplied by the calling module, never derived here. */
  dataset?: ReportDataset;
  schedule?: ReportSchedule | null;
  distribution?: ReportDistributionTarget[];
  /** Queue the export instead of rendering inline. */
  async?: boolean;
  expiresInDays?: number;
}

export interface ReportFilter {
  organisationId?: string;
  workspaceId?: string;
  status?: ReportStatus;
  reportType?: ReportType;
  format?: ReportFormat;
  query?: string;
  limit?: number;
  includeArchived?: boolean;
}

export interface DownloadCentreEntry {
  report: Report;
  available: boolean;
  expired: boolean;
  expiresInHours: number | null;
  /** Present only for `completed`, unexpired reports. */
  downloadUrl: string | null;
}

export interface DownloadCentrePayload {
  available: DownloadCentreEntry[];
  queue: DownloadCentreEntry[];
  expired: DownloadCentreEntry[];
  generatedAt: string;
}

export interface ReportDetailPayload {
  report: Report;
  template: ReportTemplate | null;
  versions: Report[];
  history: ReportEvent[];
}
