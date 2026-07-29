import type {
  AssessmentDetail,
  AssessmentResults,
  AssessmentSession,
  RuntimeStatus,
} from "./types";

const OWNER_KEY_STORAGE = "deliveryiq.owner-key";

/** Stable per-browser workspace key used to scope assessments. */
export function getOwnerKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(OWNER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(OWNER_KEY_STORAGE, key);
  }
  return key;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/assessments${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-owner-key": getOwnerKey(),
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
  create: (input: { organisationName: string; contactName?: string | null }) =>
    request<{ session: AssessmentSession }>("", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  get: (id: string) => request<AssessmentDetail>(`/${id}`),
  save: (
    id: string,
    body: {
      answers?: { questionId: string; value: number | string | null; notes?: string | null }[];
      currentSection?: string | null;
      organisationName?: string;
    },
  ) => request<AssessmentDetail>(`/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  submit: (id: string) => request<RuntimeStatus>(`/${id}/submit`, { method: "POST" }),
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
