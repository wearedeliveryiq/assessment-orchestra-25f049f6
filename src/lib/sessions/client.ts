import { supabase } from "@/integrations/supabase/client";

import type { ApiResponse } from "@/lib/identity/types";
import type {
  AssessmentSession,
  AssessmentSessionView,
  AssignmentInput,
  CreateSessionInput,
  SessionDashboard,
  SessionDetail,
  SessionHistoryEntry,
  SessionParticipant,
  SessionSearchFilter,
  SessionTimelineEvent,
  UpdateSessionInput,
} from "./types";

/**
 * Browser-side Assessment Session client. All lifecycle rules live on the
 * server; this module is only an HTTP boundary with a typed surface.
 */

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`/api/assessment-sessions${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!payload) throw new Error("The server returned an unexpected response.");
  if (!payload.success) throw new Error(payload.error.message);
  return payload.data;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  call<T>(path, { method, body: JSON.stringify(body ?? {}) });

function queryString(filter: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listSessions(
  filter: SessionSearchFilter & { assignedToMe?: boolean; ownedByMe?: boolean } = {},
): Promise<AssessmentSessionView[]> {
  const { query, ...rest } = filter;
  return call(`${queryString({ ...rest, q: query })}`);
}

export const getDashboard = (filter: { organisationId?: string; workspaceId?: string } = {}) =>
  call<SessionDashboard>(`/dashboard${queryString(filter)}`);

export const getSession = (id: string) => call<SessionDetail>(`/${id}`);

export const createSession = (input: CreateSessionInput) =>
  send<AssessmentSessionView>("POST", "", input);

export const updateSession = (id: string, patch: UpdateSessionInput) =>
  send<AssessmentSessionView>("PUT", `/${id}`, patch);

export const assignSession = (id: string, input: AssignmentInput) =>
  send<AssessmentSession>("POST", `/${id}/assign`, input);

export const transferOwnership = (id: string, ownerId: string, note?: string) =>
  send<AssessmentSession>("POST", `/${id}/owner`, { ownerId, note });

export const startSession = (id: string) => send<AssessmentSession>("POST", `/${id}/start`);
export const pauseSession = (id: string, reason?: string) =>
  send<AssessmentSession>("POST", `/${id}/pause`, { reason });
export const resumeSession = (id: string) => send<AssessmentSession>("POST", `/${id}/resume`);
export const submitForReview = (id: string) => send<AssessmentSession>("POST", `/${id}/review`);
export const completeSession = (id: string) => send<AssessmentSession>("POST", `/${id}/complete`);
export const archiveSession = (id: string, reason?: string) =>
  send<AssessmentSession>("POST", `/${id}/archive`, { reason });
export const restoreSession = (id: string) => send<AssessmentSession>("DELETE", `/${id}/archive`);
export const reassessSession = (
  id: string,
  input: { name?: string; dueDate?: string | null; assignedTo?: string | null } = {},
) => send<AssessmentSessionView>("POST", `/${id}/reassess`, input);

export const listTimeline = (id: string, options: { limit?: number; before?: string } = {}) =>
  call<SessionTimelineEvent[]>(`/${id}/timeline${queryString(options)}`);

export const listHistory = (id: string, limit?: number) =>
  call<SessionHistoryEntry[]>(`/${id}/history${queryString({ limit })}`);

export const listParticipants = (id: string) =>
  call<SessionParticipant[]>(`/${id}/participants`);

export const addParticipant = (id: string, userId: string, role: string) =>
  send<SessionParticipant[]>("POST", `/${id}/participants`, { userId, role });

export const removeParticipant = (id: string, userId: string, role?: string) =>
  send<SessionParticipant[]>("DELETE", `/${id}/participants`, { userId, role });
