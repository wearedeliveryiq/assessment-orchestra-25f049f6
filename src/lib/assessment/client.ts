import type {
  AssessmentDetail,
  AssessmentResults,
  AssessmentSession,
  AssessmentAnswerInput,
  RuntimeStatus,
} from "./types";
import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await assessmentAuthHeaders();
  const response = await fetch(`/api/assessments${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

export const assessmentApi = {
  list: () => request<{ sessions: AssessmentSession[] }>(""),
  create: (input: {
    organisationName: string;
    contactName?: string | null;
    assessmentType?: string;
  }) =>
    request<{ session: AssessmentSession }>("", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  get: (id: string) => request<AssessmentDetail>(`/${id}`),
  save: (
    id: string,
    body: {
      answers?: AssessmentAnswerInput[];
      currentSection?: string | null;
      organisationName?: string;
    },
  ) => request<AssessmentDetail>(`/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  submit: (
    id: string,
    options: {
      reviewAcknowledged?: boolean;
      missingAcknowledged?: boolean;
      evidenceRecencyDeclaration?: string;
      perspectiveBreadthDeclaration?: string;
    } = {},
  ) =>
    request<RuntimeStatus>(`/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  advance: (id: string) => request<RuntimeStatus>(`/${id}/advance`, { method: "POST" }),
  retry: (id: string) => request<RuntimeStatus>(`/${id}/retry`, { method: "POST" }),
  status: (id: string) => request<RuntimeStatus>(`/${id}/status`),
  results: (id: string) =>
    request<{ session: AssessmentSession; results: AssessmentResults }>(`/${id}/results`),
  archive: (id: string) => request<{ session: AssessmentSession }>(`/${id}`, { method: "DELETE" }),
};

export const assessmentKeys = {
  list: ["assessments"] as const,
  detail: (id: string) => ["assessments", id] as const,
  status: (id: string) => ["assessments", id, "status"] as const,
  results: (id: string) => ["assessments", id, "results"] as const,
};
