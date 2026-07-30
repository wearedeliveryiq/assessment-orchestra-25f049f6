import { getOwnerKey } from "../assessment/client";
import type { Narrative, NarrativeRunSummary, NarrativeTrace } from "./types";

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

export const narrativeApi = {
  run: (assessmentId: string) =>
    request<{ narrative: Narrative; run: NarrativeRunSummary }>("/runtime/narrative", {
      method: "POST",
      body: JSON.stringify({ assessmentId }),
    }),
  forAssessment: (assessmentId: string) =>
    request<{ sessionId: string; narrative: Narrative | null }>(
      `/assessment/${assessmentId}/narrative`,
    ),
  get: (narrativeId: string) => request<NarrativeTrace>(`/narrative/${narrativeId}`),
};

export const narrativeKeys = {
  all: ["narrative"] as const,
  forAssessment: (id: string) => ["narrative", "assessment", id] as const,
  detail: (id: string) => ["narrative", "detail", id] as const,
};
