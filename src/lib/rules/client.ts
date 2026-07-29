import { getOwnerKey } from "../assessment/client";
import type { RuleResult, RuleRunSummary, RuleTrace } from "./types";

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

export const ruleApi = {
  run: (assessmentId: string) =>
    request<{ summary: RuleRunSummary; rules: RuleResult[] }>("/runtime/rules", {
      method: "POST",
      body: JSON.stringify({ assessmentId }),
    }),
  listForAssessment: (assessmentId: string) =>
    request<{ sessionId: string; rules: RuleResult[] }>(`/assessment/${assessmentId}/rules`),
  get: (ruleId: string) => request<RuleTrace>(`/rule/${ruleId}`),
};

export const ruleKeys = {
  all: ["rules"] as const,
  forAssessment: (id: string) => ["rules", "assessment", id] as const,
  detail: (id: string) => ["rules", "detail", id] as const,
};
