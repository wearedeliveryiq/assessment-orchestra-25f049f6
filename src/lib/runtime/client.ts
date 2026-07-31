import { getOwnerKey } from "@/lib/assessment/client";
import type {
  AssessmentCatalogueEntry,
  AssessmentSummary,
  ProgressSnapshot,
  ResponseValue,
  RuntimeSession,
  RuntimeSnapshot,
  ValidationOutcome,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/assessment${path}`, {
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

export type Answer = { questionId: string; value: ResponseValue };

export const runtimeApi = {
  catalogue: () =>
    request<{ assessments: AssessmentCatalogueEntry[]; sessions: RuntimeSession[] }>("/catalogue"),
  start: (body: { packId?: string; packVersion?: string; metadata?: Record<string, unknown> }) =>
    request<RuntimeSnapshot>("/start", { method: "POST", body: JSON.stringify(body) }),
  get: (id: string) => request<RuntimeSnapshot>(`/${id}`),
  progress: (id: string) => request<ProgressSnapshot>(`/${id}/progress`),
  answer: (id: string, body: Answer) =>
    request<{ snapshot: RuntimeSnapshot; validation: ValidationOutcome }>(`/${id}/response`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  save: (id: string, body: { answers?: Answer[]; currentPageId?: string | null }) =>
    request<RuntimeSnapshot>(`/${id}/save`, { method: "POST", body: JSON.stringify(body) }),
  navigate: (
    id: string,
    command:
      | { direction: "next" }
      | { direction: "previous" }
      | { direction: "goto"; pageId: string }
      | { direction: "section"; sectionId: string },
    answers?: Answer[],
  ) =>
    request<RuntimeSnapshot>(`/${id}/navigate`, {
      method: "POST",
      body: JSON.stringify({ command, answers }),
    }),
  pause: (id: string) => request<RuntimeSnapshot>(`/${id}/pause`, { method: "POST" }),
  resume: (id: string) => request<RuntimeSnapshot>(`/${id}/resume`, { method: "POST" }),
  complete: (id: string) => request<AssessmentSummary>(`/${id}/complete`, { method: "POST" }),
  summary: (id: string) => request<AssessmentSummary>(`/${id}/summary`),
};

export const runtimeKeys = {
  catalogue: ["runtime", "catalogue"] as const,
  session: (id: string) => ["runtime", "session", id] as const,
  summary: (id: string) => ["runtime", "summary", id] as const,
};

/** Best-effort save issued while the tab is closing. */
export function saveBeacon(id: string, answers: Answer[], currentPageId: string | null) {
  if (typeof navigator === "undefined" || answers.length === 0) return;
  const blob = new Blob([JSON.stringify({ answers, currentPageId, ownerKey: getOwnerKey() })], {
    type: "application/json",
  });
  // Beacons cannot set headers, so fall back to a keepalive fetch with the key.
  void fetch(`/api/assessment/${id}/save`, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json", "x-owner-key": getOwnerKey() },
    body: blob,
  }).catch(() => undefined);
}
