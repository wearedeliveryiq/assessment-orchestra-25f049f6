import { supabase } from "@/integrations/supabase/client";

import type { ApiResponse } from "@/lib/identity/types";
import type {
  CreateReportRequest,
  DownloadCentrePayload,
  Report,
  ReportBranding,
  ReportDetailPayload,
  ReportEvent,
  ReportFilter,
  ReportFormat,
  ReportTemplate,
} from "./types";

/**
 * Browser-side reporting client. Generation, storage and authorisation all
 * live on the server; this module is only a typed HTTP boundary.
 */

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`/api/reporting${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!payload) throw new Error("The server returned an unexpected response.");
  if (!payload.success) throw new Error(payload.error.message);
  return payload.data;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  call<T>(path, { method, body: JSON.stringify(body ?? {}) });

function queryString(filter: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface TemplateCatalogue {
  templates: ReportTemplate[];
  formats: ReportFormat[];
  plannedFormats: string[];
}

export const listTemplates = () => call<TemplateCatalogue>("/templates");

export const listReports = (filter: ReportFilter & { organisationId: string }) =>
  call<Report[]>(`/reports${queryString(filter)}`);

export const createReport = (request: CreateReportRequest) =>
  send<Report>("POST", "/reports", request);

export const getReport = (id: string, organisationId: string) =>
  call<ReportDetailPayload>(`/reports/${id}${queryString({ organisationId })}`);

export const regenerateReport = (
  id: string,
  organisationId: string,
  overrides: { format?: ReportFormat } = {},
) => send<Report>("POST", `/reports/${id}/regenerate`, { organisationId, ...overrides });

export const retryReport = (id: string, organisationId: string) =>
  send<Report>("POST", `/reports/${id}/retry`, { organisationId });

export const archiveReport = (id: string, organisationId: string) =>
  send<Report>("POST", `/reports/${id}/archive`, { organisationId });

export const deleteReport = (id: string, organisationId: string) =>
  send<{ deleted: boolean }>("DELETE", `/reports/${id}${queryString({ organisationId })}`);

export const downloadCentre = (organisationId: string, filter: Omit<ReportFilter, "organisationId"> = {}) =>
  call<DownloadCentrePayload>(`/download-centre${queryString({ organisationId, ...filter })}`);

export const reportHistory = (organisationId: string, options: { reportId?: string; lineageId?: string } = {}) =>
  call<ReportEvent[]>(`/history${queryString({ organisationId, ...options })}`);

export const queueSnapshot = (organisationId: string) =>
  call<{
    queued: number;
    generating: number;
    completed: number;
    failed: number;
    oldestQueuedAt: string | null;
    averageDurationMs: number;
  }>(`/queue${queryString({ organisationId })}`);

export const processQueue = (organisationId: string, limit = 5) =>
  send<{ processed: number; failed: number }>("POST", "/queue", { organisationId, limit });

export const getBranding = (organisationId: string) =>
  call<ReportBranding>(`/branding${queryString({ organisationId })}`);

export const saveBranding = (organisationId: string, branding: Partial<ReportBranding>) =>
  send<ReportBranding>("PUT", "/branding", { organisationId, branding });

/** Downloads an artefact through the authenticated endpoint. */
export async function downloadArtefact(report: Report): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(
    `/api/reporting/reports/${report.id}/download?organisationId=${report.organisationId}`,
    { headers: token ? { authorization: `Bearer ${token}` } : undefined },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiResponse<never> | null;
    throw new Error(payload && !payload.success ? payload.error.message : "The download failed.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = report.filename || "report";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Opens the print layout in a new window. */
export async function openPrintPreview(input: {
  organisationId: string;
  templateId: string;
  title?: string;
  dataset?: Record<string, unknown>;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch("/api/reporting/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...input, print: true }),
  });

  if (!response.ok) throw new Error("The print preview could not be generated.");

  const html = await response.text();
  const preview = window.open("", "_blank", "noopener,noreferrer");
  if (!preview) throw new Error("Allow pop-ups to open the print preview.");
  preview.document.write(html);
  preview.document.close();
}
