import { getOwnerKey } from "../assessment/client";
import type { Pattern, PatternRunSummary, PatternTrace } from "./types";

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

export const patternApi = {
  run: (assessmentId: string) =>
    request<{ summary: PatternRunSummary; patterns: Pattern[] }>("/runtime/patterns", {
      method: "POST",
      body: JSON.stringify({ assessmentId }),
    }),
  listForAssessment: (assessmentId: string) =>
    request<{ sessionId: string; patterns: Pattern[] }>(`/assessment/${assessmentId}/patterns`),
  get: (patternId: string) => request<PatternTrace>(`/pattern/${patternId}`),
};

export const patternKeys = {
  all: ["patterns"] as const,
  forAssessment: (id: string) => ["patterns", "assessment", id] as const,
  detail: (id: string) => ["patterns", "detail", id] as const,
};
