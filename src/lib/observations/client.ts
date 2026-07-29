import { getOwnerKey } from "../assessment/client";
import type { Observation, ObservationRunSummary, ObservationTrace } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-owner-key": getOwnerKey(),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export const observationApi = {
  run: (assessmentId: string) =>
    request<{ summary: ObservationRunSummary; observations: Observation[] }>(
      "/runtime/observations",
      { method: "POST", body: JSON.stringify({ assessmentId }) },
    ),
  listForAssessment: (assessmentId: string) =>
    request<{ sessionId: string; observations: Observation[] }>(
      `/assessment/${assessmentId}/observations`,
    ),
  get: (observationId: string) => request<ObservationTrace>(`/observation/${observationId}`),
};

export const observationKeys = {
  all: ["observations"] as const,
  forAssessment: (id: string) => ["observations", "assessment", id] as const,
  detail: (id: string) => ["observations", "detail", id] as const,
};
