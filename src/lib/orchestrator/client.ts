import { getOwnerKey } from "../assessment/client";
import type {
  ExecutionMode,
  ExecutionStatus,
  ExecutionView,
  RuntimeMonitorSnapshot,
} from "./types";

/** Lightweight status payload returned by GET /api/executions/:id/status. */
export interface ExecutionStatusPayload {
  executionId: string;
  assessmentSessionId: string;
  status: ExecutionStatus;
  progress: {
    percentage: number;
    completed: number;
    total: number;
    currentStage: string | null;
    estimatedRemainingMs: number | null;
    estimatedCompletionAt: string | null;
  };
  isTerminal: boolean;
  errorMessage: string | null;
  failureClass: "transient" | "permanent" | null;
  retryCount: number;
  stages: {
    stageId: string;
    label: string;
    status: string;
    attempt: number;
    durationMs: number;
    errorMessage: string | null;
  }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
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

function query(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : "";
}

export const orchestratorApi = {
  execute: (sessionId: string, mode: ExecutionMode = "manual") =>
    request<ExecutionView>(`/assessments/${sessionId}/execute`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),
  latest: (sessionId: string) =>
    request<ExecutionView | null>(`/assessments/${sessionId}/execute`),
  get: (executionId: string) => request<ExecutionView>(`/executions/${executionId}`),
  status: (executionId: string) =>
    request<ExecutionStatusPayload>(`/executions/${executionId}/status`),
  cancel: (executionId: string) =>
    request<ExecutionView>(`/executions/${executionId}/cancel`, { method: "POST" }),
  retry: (executionId: string, fromStart = false) =>
    request<ExecutionView>(`/executions/${executionId}/retry`, {
      method: "POST",
      body: JSON.stringify({ fromStart }),
    }),
  history: (filters: Record<string, string | number | undefined> = {}) =>
    request<ExecutionView[]>(`/executions/history${query(filters)}`),
  monitor: (filters: Record<string, string | number | undefined> = {}) =>
    request<RuntimeMonitorSnapshot>(`/executions/monitor${query(filters)}`),
};

export const orchestratorKeys = {
  latest: (sessionId: string) => ["executions", "latest", sessionId] as const,
  status: (executionId: string) => ["executions", executionId, "status"] as const,
  monitor: (filters: Record<string, unknown>) => ["executions", "monitor", filters] as const,
};
