import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";

import type {
  SnapshotConfigurationVersion,
  SnapshotMaturityLevel,
  SnapshotProfileAxis,
  SnapshotResponse,
} from "./snapshot";

const snapshotSessionKey = "deliveryiq_dna_snapshot_session";

function snapshotSessionToken(): string | null {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(snapshotSessionKey);
}

function rememberSnapshotSession(response: Response): void {
  if (typeof window === "undefined") return;
  const token = response.headers.get("x-deliveryiq-snapshot-session");
  if (token) window.sessionStorage.setItem(snapshotSessionKey, token);
}

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
  const sessionToken = snapshotSessionToken();
  const response = await fetch(`/api/delivery-dna-snapshot${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { "x-deliveryiq-snapshot-session": sessionToken } : {}),
      ...(init.headers ?? {}),
    },
  });
  rememberSnapshotSession(response);
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
    request<{ assessmentId: string; saved: true }>("/continue", {
      method: "POST",
      headers: await assessmentAuthHeaders(),
      body: JSON.stringify({ consent }),
    }),
};
