import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";
import type { Signal, SignalRunSummary, SignalTrace } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await assessmentAuthHeaders();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export const signalApi = {
  run: (assessmentId: string) =>
    request<{ summary: SignalRunSummary; signals: Signal[] }>("/runtime/signals", {
      method: "POST",
      body: JSON.stringify({ assessmentId }),
    }),
  listForAssessment: (assessmentId: string) =>
    request<{ sessionId: string; signals: Signal[] }>(`/assessment/${assessmentId}/signals`),
  get: (signalId: string) => request<SignalTrace>(`/signal/${signalId}`),
};

export const signalKeys = {
  all: ["signals"] as const,
  forAssessment: (id: string) => ["signals", "assessment", id] as const,
  detail: (id: string) => ["signals", "detail", id] as const,
};
