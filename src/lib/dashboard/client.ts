import { getOwnerKey } from "../assessment/client";
import type { DashboardExportFormat, DashboardPayload } from "./types";

/**
 * DashboardService — the only place the dashboard talks to the backend.
 * Widgets never fetch; they read from the DashboardDataProvider.
 */
export const dashboardApi = {
  async get(assessmentId: string): Promise<DashboardPayload> {
    const response = await fetch(`/assessment/${assessmentId}/dashboard`, {
      headers: { "content-type": "application/json", "x-owner-key": getOwnerKey() },
    });
    const payload = (await response.json().catch(() => null)) as
      | (DashboardPayload & { error?: string })
      | null;
    if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
    return payload as DashboardPayload;
  },

  /**
   * Exports are rendered by the backend; the browser only opens the URL.
   * The owner key travels as a query param because these are top-level
   * navigations rather than fetches.
   */
  exportUrl(assessmentId: string, format: DashboardExportFormat): string {
    return `/assessment/${assessmentId}/export/${format}?k=${encodeURIComponent(getOwnerKey())}`;
  },
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: (id: string) => ["dashboard", id] as const,
};
