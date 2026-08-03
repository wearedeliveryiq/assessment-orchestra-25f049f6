import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";

import type {
  SnapshotConfigurationVersion,
  SnapshotMaturityLevel,
  SnapshotProfileAxis,
  SnapshotResponse,
} from "./snapshot";

export type SnapshotResult = {
  available: boolean;
  reasonCode: string | null;
  answeredCount: number;
  indicativeMaturityLevel: SnapshotMaturityLevel | null;
  profile: SnapshotProfileAxis[];
  positiveSignals: { capabilityId: string; capabilityLabel: string; text: string }[];
  areasToExplore: { capabilityId: string; capabilityLabel: string; text: string }[];
};

export type SnapshotState = {
  status: "in_progress" | "completed" | "linked";
  configurationVersion: SnapshotConfigurationVersion;
  presentationPolicyVersion: "1.0.0" | "1.1.0";
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
  start: (restart = false) =>
    request<{ snapshot: SnapshotState }>("", {
      method: "POST",
      body: JSON.stringify({ restart }),
    }),
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
