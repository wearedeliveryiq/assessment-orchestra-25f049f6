import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";

import type { SnapshotResponse } from "./snapshot";

export type SnapshotResult = {
  available: boolean;
  reasonCode: string | null;
  positiveSignals: { capabilityId: string; capabilityLabel: string; text: string }[];
  areasToExplore: { capabilityId: string; capabilityLabel: string; text: string }[];
};

export type SnapshotState = {
  status: "in_progress" | "completed" | "linked";
  expiresAt: string;
  responses: SnapshotResponse[];
  result: SnapshotResult | null;
  linkedAssessmentId: string | null;
};

async function request<T>(path = "", init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/delivery-dna-snapshot${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!response.ok) throw new Error(payload?.error ?? "The Snapshot is temporarily unavailable.");
  return payload as T;
}

export const deliveryDnaSnapshotApi = {
  get: () => request<{ snapshot: SnapshotState | null }>(),
  start: () => request<{ snapshot: SnapshotState }>("", { method: "POST", body: "{}" }),
  save: (input: {
    questionId: string;
    status: "answered" | "not_applicable";
    answer?: number | null;
    notApplicableReasonText?: string | null;
  }) =>
    request<{ snapshot: SnapshotState }>("", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  complete: () =>
    request<{ snapshot: SnapshotState; result: SnapshotResult }>("/complete", {
      method: "POST",
      body: "{}",
    }),
  continue: async (consent: boolean) =>
    request<{ assessmentId: string }>("/continue", {
      method: "POST",
      headers: await assessmentAuthHeaders(),
      body: JSON.stringify({ consent }),
    }),
};
