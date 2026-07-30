import { getOwnerKey } from "../assessment/client";
import type { Report, ReportGenerationRequest, ReportListPayload } from "./types";

/**
 * Report Engine client. The browser never renders a document — it requests
 * one, polls the lifecycle and downloads the artefact the backend stored.
 */
async function parse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error ?? `Request failed (${response.status})`);
  return body as T;
}

export const reportsApi = {
  list(assessmentId: string): Promise<ReportListPayload> {
    return fetch(`/assessment/${assessmentId}/reports`, {
      headers: { "x-owner-key": getOwnerKey() },
    }).then(parse<ReportListPayload>);
  },

  create(assessmentId: string, request: ReportGenerationRequest): Promise<{ reports: Report[] }> {
    return fetch(`/assessment/${assessmentId}/reports`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-owner-key": getOwnerKey() },
      body: JSON.stringify(request),
    }).then(parse<{ reports: Report[] }>);
  },

  /** Top-level navigation, so the owner key travels as a query param. */
  downloadUrl(reportId: string): string {
    return `/report/${reportId}/download?k=${encodeURIComponent(getOwnerKey())}`;
  },
};

export const reportKeys = {
  list: (assessmentId: string) => ["reports", assessmentId] as const,
};
