import { supabase } from "@/integrations/supabase/client";
import { clearAssessmentTenantCache } from "@/lib/identity/assessment-auth";

import type { ApiResponse } from "@/lib/identity/types";
import type { WorkspaceMemberView } from "./workspace-membership.server";
import type {
  MemberView,
  OrganisationSettings,
  OrganisationSummary,
  PlatformNotification,
  TenantAuditEvent,
  TenantInvitation,
  TenantSearchResults,
  WorkspaceContext,
  WorkspaceSettings,
  WorkspaceSummary,
  WorkspaceType,
} from "./types";

/**
 * Browser-side tenancy client. All tenancy logic (and every isolation check)
 * lives on the server; this module only speaks HTTP.
 */

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`/api/${path}`, {
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

/* ------------------------------ organisations ----------------------------- */

export function listOrganisations(query?: string): Promise<OrganisationSummary[]> {
  return call(`organisations${query ? `?q=${encodeURIComponent(query)}` : ""}`);
}

export function getOrganisation(id: string): Promise<{
  organisation: OrganisationSummary;
  workspaces: WorkspaceSummary[];
  members: MemberView[];
  invitations: TenantInvitation[];
  audit: TenantAuditEvent[];
}> {
  return call(`organisations/${id}`);
}

export function createOrganisation(input: Record<string, unknown>): Promise<OrganisationSummary> {
  return send("POST", "organisations", input);
}

export function updateOrganisation(
  id: string,
  patch: Record<string, unknown>,
): Promise<OrganisationSummary> {
  return send("PUT", `organisations/${id}`, patch);
}

export function archiveOrganisation(id: string): Promise<{ archived: boolean }> {
  return send("DELETE", `organisations/${id}`);
}

/* -------------------------------- workspaces ------------------------------ */

export function listWorkspaces(params: {
  organisationId?: string;
  q?: string;
  includeArchived?: boolean;
} = {}): Promise<{ workspaces: WorkspaceSummary[]; types: WorkspaceType[] }> {
  const search = new URLSearchParams();
  if (params.organisationId) search.set("organisationId", params.organisationId);
  if (params.q) search.set("q", params.q);
  if (params.includeArchived) search.set("includeArchived", "true");
  const query = search.toString();
  return call(`workspaces${query ? `?${query}` : ""}`);
}

export function getWorkspace(id: string): Promise<{
  workspace: WorkspaceSummary;
  members: WorkspaceMemberView[];
  settings: WorkspaceSettings;
  audit: TenantAuditEvent[];
}> {
  return call(`workspaces/${id}`);
}

export function createWorkspace(input: Record<string, unknown>): Promise<WorkspaceSummary> {
  return send("POST", "workspaces", input);
}

export function updateWorkspace(
  id: string,
  patch: Record<string, unknown>,
): Promise<WorkspaceSummary> {
  return send("PUT", `workspaces/${id}`, patch);
}

export function deleteWorkspace(id: string): Promise<{ deleted: boolean }> {
  return send("DELETE", `workspaces/${id}`);
}

export function setWorkspaceFavourite(id: string, favourite: boolean): Promise<WorkspaceContext> {
  return send("PUT", `workspaces/${id}`, { favourite });
}

/* --------------------------------- members -------------------------------- */

export function listMembers(organisationId: string, q?: string): Promise<MemberView[]> {
  const search = new URLSearchParams({ organisationId });
  if (q) search.set("q", q);
  return call(`members?${search.toString()}`);
}

export function inviteMember(input: {
  organisationId: string;
  email: string;
  role?: string;
  workspaceId?: string | null;
  workspaceRole?: string | null;
  message?: string;
}): Promise<{ invitation: TenantInvitation; inviteUrl: string }> {
  return send("POST", "members/invite", input);
}

export function updateMember(
  membershipId: string,
  patch: { role?: string; status?: string },
): Promise<MemberView[]> {
  return send("PUT", `members/${membershipId}`, patch);
}

export function removeMember(membershipId: string): Promise<MemberView[]> {
  return send("DELETE", `members/${membershipId}`);
}

/* ------------------------------- workspace ops ---------------------------- */

export async function switchWorkspace(workspaceId: string): Promise<WorkspaceContext> {
  const context = await send<WorkspaceContext>("POST", "workspace/switch", { workspaceId });
  clearAssessmentTenantCache();
  return context;
}

export function workspaceContext(): Promise<WorkspaceContext> {
  return call("workspace/switch");
}

/* --------------------------------- settings ------------------------------- */

export function getOrganisationSettings(organisationId: string): Promise<OrganisationSettings> {
  return call(`settings/organisation?organisationId=${organisationId}`);
}

export function updateOrganisationSettings(
  organisationId: string,
  patch: Record<string, unknown>,
): Promise<OrganisationSettings> {
  return send("PUT", "settings/organisation", { organisationId, ...patch });
}

export function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  return call(`settings/workspace?workspaceId=${workspaceId}`);
}

export function updateWorkspaceSettings(
  workspaceId: string,
  patch: Record<string, unknown>,
): Promise<WorkspaceSettings> {
  return send("PUT", "settings/workspace", { workspaceId, ...patch });
}

/* ---------------------------- search + notifications ---------------------- */

export function searchTenancy(query: string): Promise<TenantSearchResults> {
  return call(`tenancy/search?q=${encodeURIComponent(query)}`);
}

export function listNotifications(): Promise<PlatformNotification[]> {
  return call("notifications");
}

export function markNotificationsRead(ids: string[] = []): Promise<{ read: boolean }> {
  return send("POST", "notifications", { ids });
}

export type {
  MemberView,
  OrganisationSettings,
  OrganisationSummary,
  PlatformNotification,
  TenantAuditEvent,
  TenantInvitation,
  TenantSearchResults,
  WorkspaceContext,
  WorkspaceMemberView,
  WorkspaceSettings,
  WorkspaceSummary,
  WorkspaceType,
};
