/**
 * Executive Report Generation Engine — client-safe contracts.
 *
 * A Report is an immutable, versioned rendering of the intelligence the
 * runtime already produced. Nothing in `src/lib/reports/*` calculates a score,
 * pattern, recommendation or narrative: the engine assembles, renders and
 * persists what the Intelligence Runtime published.
 */

export type ReportType = "executive-summary" | "full-assessment" | "board-presentation";

export type ReportFormat = "pdf" | "docx" | "pptx" | "json";

export type ReportStatus = "queued" | "generating" | "completed" | "failed";

/** Configurable branding applied to every rendered artefact. */
export interface ReportBranding {
  productName: string;
  logoText: string;
  tagline: string;
  /** Hex colours without the leading `#`. */
  primary: string;
  accent: string;
  ink: string;
  muted: string;
  surface: string;
  headingFont: string;
  bodyFont: string;
  footerNote: string;
}

/* ------------------------------------------------------------------ *
 * Document model — the format-neutral shape every renderer consumes.
 * ------------------------------------------------------------------ */

export type ReportBlock =
  | { kind: "heading"; text: string; level: 2 | 3 }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "kpis"; items: { label: string; value: string }[] }
  | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[] }
  | { kind: "note"; text: string }
  | { kind: "pagebreak" };

export interface ReportDocumentSection {
  id: string;
  title: string;
  /** Included in the table of contents when true. */
  listed: boolean;
  blocks: ReportBlock[];
}

export interface ReportCover {
  title: string;
  subtitle: string;
  organisation: string;
  maturity: string;
  overall: string;
  confidence: string;
  generatedAt: string;
  knowledgePack: string;
}

export interface ReportDocument {
  reportType: ReportType;
  templateId: string;
  title: string;
  organisation: string;
  generatedAt: string;
  branding: ReportBranding;
  cover: ReportCover;
  sections: ReportDocumentSection[];
  /** Verbatim source payload, emitted by the JSON renderer. */
  data: unknown;
  /** Figures the validator cross-checks against the source payload. */
  facts: ReportFacts;
}

export interface ReportFacts {
  capabilities: number;
  patterns: number;
  recommendations: number;
  observations: number;
  signals: number;
  rules: number;
  responses: number;
  narrativeSections: number;
  overallPercentage: number | null;
  maturityLevel: string | null;
  confidence: number;
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

export type ReportSectionId =
  | "executive-summary"
  | "assessment-overview"
  | "capability-summary"
  | "patterns"
  | "recommendations"
  | "roadmap"
  | "evidence-appendix"
  | "metadata";

export interface ReportTemplate {
  id: string;
  reportType: ReportType;
  name: string;
  description: string;
  formats: ReportFormat[];
  defaultFormats: ReportFormat[];
  includeToc: boolean;
  sections: ReportSectionId[];
}

/* ------------------------------------------------------------------ *
 * Persisted entity
 * ------------------------------------------------------------------ */

export interface ReportValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface ReportValidationResult {
  valid: boolean;
  checkedAt: string;
  issues: ReportValidationIssue[];
}

export interface ReportMetadata {
  facts?: ReportFacts;
  sectionIds?: string[];
  sourceGeneratedAt?: string;
  assessmentStatus?: string;
  [key: string]: unknown;
}

export interface Report {
  id: string;
  sessionId: string;
  reportType: ReportType;
  format: ReportFormat;
  version: number;
  status: ReportStatus;
  templateId: string;
  title: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  filename: string;
  contentType: string;
  storagePath: string | null;
  fileSize: number;
  checksum: string;
  branding: ReportBranding | Record<string, never>;
  metadata: ReportMetadata;
  validation: ReportValidationResult | Record<string, never>;
  error: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportGenerationRequest {
  reportType: ReportType;
  formats?: ReportFormat[];
  title?: string;
  branding?: Partial<ReportBranding>;
}

export interface ReportListPayload {
  templates: ReportTemplate[];
  reports: Report[];
}

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  docx: "Word",
  pptx: "PowerPoint",
  json: "JSON",
};

export const REPORT_CONTENT_TYPES: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  json: "application/json; charset=utf-8",
};
