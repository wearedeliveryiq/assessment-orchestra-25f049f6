import { assessmentAuthHeaders, openAuthenticatedDownload } from "@/lib/identity/assessment-auth";

import type {
  SnapshotV2ConfigurationVersion,
  SnapshotV2DomainProfile,
  SnapshotV2PresentationPolicyVersion,
  SnapshotV2Response,
} from "./snapshot-v2";
import type { DeliveryDnaV2Level } from "./catalogue-v2";

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
  indicativeMaturityLevel: DeliveryDnaV2Level | null;
  profile: SnapshotV2DomainProfile[];
  positiveSignals: { domainId: string; domainLabel: string; text: string }[];
  areasToExplore: { domainId: string; domainLabel: string; text: string }[];
  industryContext?: Array<{
    evidenceId: string;
    evidenceVersion: string;
    approvedCustomerWording: string;
    footnoteMarker: string;
    sourcePublisher: string;
    sourceTitle: string;
    sourceNote: string;
    originalSourceReference: string;
    evidenceYear: number;
    scopeCaveat: string;
    selectionReason: string;
    mandatoryDisclosure: string;
  }>;
};

export type SnapshotState = {
  status: "in_progress" | "completed" | "linked";
  configurationVersion: SnapshotV2ConfigurationVersion;
  presentationPolicyVersion: SnapshotV2PresentationPolicyVersion;
  expiresAt: string;
  scopeType: string;
  scopeDisplayName: string;
  responses: SnapshotV2Response[];
  result: SnapshotResult | null;
  linkedAssessmentId: string | null;
};

async function request<T>(path = "", init: RequestInit = {}): Promise<T> {
  const sessionToken = snapshotSessionToken();
  const authHeaders = await assessmentAuthHeaders();
  const response = await fetch(`/api/delivery-dna-snapshot${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...authHeaders,
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
  start: (restart = false, scope?: { scopeType: string; scopeDisplayName: string }) =>
    request<{ snapshot: SnapshotState }>("", {
      method: "POST",
      body: JSON.stringify({ restart, ...scope }),
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
  download: () => openAuthenticatedDownload("/api/delivery-dna-snapshot/report.pdf"),
};
