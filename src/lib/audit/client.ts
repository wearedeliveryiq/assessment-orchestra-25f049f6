import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";
import type {
  AuditDashboard,
  AuditEvent,
  AuditEventPage,
  DecisionTrace,
  EvidenceEntityType,
  EvidenceGraph,
  EvidenceNeighbourhood,
  ExplanationResult,
  RetentionPolicy,
  RetentionRunResult,
} from "./types";

/** Browser client for the Audit & Explainability REST APIs. */
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

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export type AuditListParams = {
  assessmentId?: string;
  engine?: string;
  eventType?: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export const auditApi = {
  events: (params: AuditListParams = {}) =>
    request<AuditEventPage>(`/audit/events${qs(params)}`),
  assessmentEvents: (assessmentId: string, params: AuditListParams = {}) =>
    request<AuditEventPage>(`/audit/${assessmentId}${qs(params)}`),
  event: (id: string) => request<{ event: AuditEvent }>(`/audit/event/${id}`),
  dashboard: (params: Omit<AuditListParams, "limit" | "offset"> = {}) =>
    request<AuditDashboard>(`/audit/dashboard${qs(params)}`),
  graph: (assessmentId: string) =>
    request<EvidenceGraph>(`/assessment/${assessmentId}/evidence-graph`),
  evidence: (entityType: EvidenceEntityType, entityId: string, assessmentId?: string) =>
    request<EvidenceNeighbourhood>(
      `/evidence/${entityType}/${entityId}${qs({ assessmentId })}`,
    ),
  trace: (
    entityType: EvidenceEntityType,
    entityId: string,
    options: { assessmentId?: string; direction?: "upstream" | "downstream" } = {},
  ) => request<DecisionTrace>(`/trace/${entityType}/${entityId}${qs(options)}`),
  explain: (
    entityType: EvidenceEntityType,
    entityId: string,
    options: { assessmentId?: string; question?: string } = {},
  ) => request<ExplanationResult>(`/explain/${entityType}/${entityId}${qs(options)}`),
  retentionPolicies: () => request<{ policies: RetentionPolicy[] }>(`/audit/retention`),
  applyRetention: () => request<RetentionRunResult>(`/audit/retention`, { method: "POST" }),
};

export const auditKeys = {
  dashboard: (params: unknown) => ["audit", "dashboard", params] as const,
  events: (params: unknown) => ["audit", "events", params] as const,
  graph: (assessmentId: string) => ["audit", "graph", assessmentId] as const,
  trace: (type: string, id: string, direction: string) =>
    ["audit", "trace", type, id, direction] as const,
  explain: (type: string, id: string) => ["audit", "explain", type, id] as const,
  retention: ["audit", "retention"] as const,
};
