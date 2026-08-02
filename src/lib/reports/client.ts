import {
  assessmentAuthHeaders,
  openAuthenticatedDownload,
} from "@/lib/identity/assessment-auth";
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
  async list(assessmentId: string): Promise<ReportListPayload> {
    return fetch(`/assessment/${assessmentId}/reports`, {
      headers: await assessmentAuthHeaders(),
    }).then(parse<ReportListPayload>);
  },

  async create(
    assessmentId: string,
    request: ReportGenerationRequest,
  ): Promise<{ reports: Report[] }> {
    const authHeaders = await assessmentAuthHeaders();
    return fetch(`/assessment/${assessmentId}/reports`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify(request),
    }).then(parse<{ reports: Report[] }>);
  },

  download(reportId: string): Promise<void> {
    return openAuthenticatedDownload(`/report/${reportId}/download`);
  },
};

export const reportKeys = {
  list: (assessmentId: string) => ["reports", assessmentId] as const,
};
