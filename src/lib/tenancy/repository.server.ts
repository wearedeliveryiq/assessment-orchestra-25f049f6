import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { TenantErrors } from "./roles";
import type {
  MemberView,
  Organisation,
  OrganisationSettings,
  PlatformRole,
  PlatformNotification,
  TenantAuditEvent,
  TenantInvitation,
  TenantMembershipStatus,
  Workspace,
  WorkspaceMembership,
  WorkspaceSettings,
  WorkspaceType,
  WorkspaceVisit,
} from "./types";

/**
 * TenancyRepository — the single persistence boundary for organisations,
 * workspaces, membership, settings, history, notifications and audit.
 *
 * Every service goes through here so the storage engine stays replaceable and
 * so tenant filters live in exactly one layer.
 */

type Row = Record<string, any>;

const db = () => supabaseAdmin as unknown as any;

function fail(context: string, error: unknown): never {
  console.error(`[tenancy-repository] ${context}`, error);
  throw TenantErrors.internal(error);
}

/* --------------------------------- mappers -------------------------------- */

export function toOrganisation(row: Row): Organisation {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    industry: row.industry ?? "",
    organisationSize: row.organisation_size ?? "",
    country: row.country ?? "",
    timezone: row.timezone ?? "Europe/London",
    logo: row.logo ?? null,
    website: row.website ?? "",
    status: row.status ?? "active",
    subscriptionPlan: row.subscription_plan ?? "trial",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function toWorkspace(row: Row): Workspace {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    organisationName: row.organisations?.name,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    type: row.type,
    status: row.status,
    colour: row.colour,
    icon: row.icon,
    visibility: row.visibility,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWorkspaceMembership(row: Row): WorkspaceMembership {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces?.name,
    organisationId: row.workspaces?.organisation_id ?? row.organisation_id ?? "",
    userId: row.user_id,
    role: row.role as PlatformRole,
    status: row.status as TenantMembershipStatus,
    favourite: Boolean(row.favourite),
    joinedAt: row.joined_at,
  };
}

function toInvitation(row: Row): TenantInvitation {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    organisationName: row.organisations?.name,
    workspaceId: row.workspace_id ?? null,
    email: row.email,
    role: row.role as PlatformRole,
    workspaceRole: (row.workspace_role as PlatformRole) ?? null,
    message: row.message ?? "",
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function toAuditEvent(row: Row): TenantAuditEvent {
  return {
    id: row.id,
    organisationId: row.organisation_id ?? null,
    workspaceId: row.workspace_id ?? null,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? "",
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    summary: row.summary ?? "",
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function toNotification(row: Row): PlatformNotification {
  return {
    id: row.id,
    userId: row.user_id,
    organisationId: row.organisation_id ?? null,
    workspaceId: row.workspace_id ?? null,
    module: row.module,
    eventType: row.event_type,
    title: row.title,
    body: row.body ?? "",
    severity: row.severity ?? "info",
    readAt: row.read_at ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

/* ------------------------------ organisations ----------------------------- */

export async function listOrganisationsByIds(ids: string[]): Promise<Organisation[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db().from("organisations").select("*").in("id", ids);
  if (error) fail("listOrganisationsByIds", error);
  return (data ?? []).map(toOrganisation);
}

export async function listAllOrganisations(limit = 200): Promise<Organisation[]> {
  const { data, error } = await db()
    .from("organisations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listAllOrganisations", error);
  return (data ?? []).map(toOrganisation);
}

export async function getOrganisation(id: string): Promise<Organisation | null> {
  const { data, error } = await db().from("organisations").select("*").eq("id", id).maybeSingle();
  if (error) fail("getOrganisation", error);
  return data ? toOrganisation(data) : null;
}

export async function listTakenOrganisationSlugs(prefix: string): Promise<string[]> {
  const { data, error } = await db().from("organisations").select("slug").like("slug", `${prefix}%`);
  if (error) fail("listTakenOrganisationSlugs", error);
  return (data ?? []).map((row: Row) => row.slug as string);
}

export async function insertOrganisation(input: Record<string, unknown>): Promise<Organisation> {
  const { data, error } = await db().from("organisations").insert(input).select("*").maybeSingle();
  if (error) fail("insertOrganisation", error);
  return toOrganisation(data as Row);
}

export async function updateOrganisationRow(
  id: string,
  patch: Record<string, unknown>,
): Promise<Organisation> {
  const { data, error } = await db()
    .from("organisations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) fail("updateOrganisationRow", error);
  if (!data) throw TenantErrors.notFound("Organisation not found.");
  return toOrganisation(data);
}

export async function countOrganisationMembers(organisationIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (organisationIds.length === 0) return counts;
  const { data, error } = await db()
    .from("organisation_memberships")
    .select("organisation_id")
    .in("organisation_id", organisationIds)
    .eq("status", "active");
  if (error) fail("countOrganisationMembers", error);
  for (const row of data ?? []) {
    counts.set(row.organisation_id, (counts.get(row.organisation_id) ?? 0) + 1);
  }
  return counts;
}

export async function countPendingInvitations(organisationIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (organisationIds.length === 0) return counts;
  const { data, error } = await db()
    .from("organisation_invitations")
    .select("organisation_id")
    .in("organisation_id", organisationIds)
    .eq("status", "pending");
  if (error) fail("countPendingInvitations", error);
  for (const row of data ?? []) {
    counts.set(row.organisation_id, (counts.get(row.organisation_id) ?? 0) + 1);
  }
  return counts;
}

/* ------------------------------- workspaces ------------------------------- */

export async function listWorkspaceTypes(): Promise<WorkspaceType[]> {
  const { data, error } = await db()
    .from("workspace_types")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error) fail("listWorkspaceTypes", error);
  return (data ?? []).map((row: Row) => ({
    code: row.code,
    label: row.label,
    description: row.description ?? "",
    sortOrder: row.sort_order ?? 0,
    enabled: Boolean(row.enabled),
  }));
}

export async function listWorkspacesForOrganisations(
  organisationIds: string[],
): Promise<Workspace[]> {
  if (organisationIds.length === 0) return [];
  const { data, error } = await db()
    .from("workspaces")
    .select("*, organisations(name)")
    .in("organisation_id", organisationIds)
    .order("created_at", { ascending: true });
  if (error) fail("listWorkspacesForOrganisations", error);
  return (data ?? []).map(toWorkspace);
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await db()
    .from("workspaces")
    .select("*, organisations(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("getWorkspace", error);
  return data ? toWorkspace(data) : null;
}

export async function findWorkspaceByName(
  organisationId: string,
  name: string,
): Promise<Workspace | null> {
  const { data, error } = await db()
    .from("workspaces")
    .select("*")
    .eq("organisation_id", organisationId)
    .ilike("name", name)
    .maybeSingle();
  if (error) fail("findWorkspaceByName", error);
  return data ? toWorkspace(data) : null;
}

export async function listWorkspaceSlugs(organisationId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("workspaces")
    .select("slug")
    .eq("organisation_id", organisationId);
  if (error) fail("listWorkspaceSlugs", error);
  return (data ?? []).map((row: Row) => row.slug as string);
}

export async function insertWorkspace(input: Record<string, unknown>): Promise<Workspace> {
  const { data, error } = await db()
    .from("workspaces")
    .insert(input)
    .select("*, organisations(name)")
    .maybeSingle();
  if (error) fail("insertWorkspace", error);
  return toWorkspace(data as Row);
}

export async function updateWorkspaceRow(
  id: string,
  patch: Record<string, unknown>,
): Promise<Workspace> {
  const { data, error } = await db()
    .from("workspaces")
    .update(patch)
    .eq("id", id)
    .select("*, organisations(name)")
    .maybeSingle();
  if (error) fail("updateWorkspaceRow", error);
  if (!data) throw TenantErrors.notFound("Workspace not found.");
  return toWorkspace(data);
}

export async function deleteWorkspaceRow(id: string): Promise<void> {
  const { error } = await db().from("workspaces").delete().eq("id", id);
  if (error) fail("deleteWorkspaceRow", error);
}

/* -------------------------- workspace memberships ------------------------- */

export async function listWorkspaceMembershipsForUser(
  userId: string,
): Promise<WorkspaceMembership[]> {
  const { data, error } = await db()
    .from("workspace_memberships")
    .select("*, workspaces(name, organisation_id)")
    .eq("user_id", userId)
    .neq("status", "removed");
  if (error) fail("listWorkspaceMembershipsForUser", error);
  return (data ?? []).map(toWorkspaceMembership);
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMembership[]> {
  const { data, error } = await db()
    .from("workspace_memberships")
    .select("*, workspaces(name, organisation_id)")
    .eq("workspace_id", workspaceId)
    .neq("status", "removed");
  if (error) fail("listWorkspaceMembers", error);
  return (data ?? []).map(toWorkspaceMembership);
}

export async function listWorkspaceMembershipsForWorkspaces(
  workspaceIds: string[],
): Promise<WorkspaceMembership[]> {
  if (workspaceIds.length === 0) return [];
  const { data, error } = await db()
    .from("workspace_memberships")
    .select("*, workspaces(name, organisation_id)")
    .in("workspace_id", workspaceIds)
    .neq("status", "removed");
  if (error) fail("listWorkspaceMembershipsForWorkspaces", error);
  return (data ?? []).map(toWorkspaceMembership);
}

export async function upsertWorkspaceMembership(input: {
  workspaceId: string;
  userId: string;
  role: PlatformRole;
  status?: TenantMembershipStatus;
  favourite?: boolean;
}): Promise<WorkspaceMembership> {
  const payload: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    role: input.role,
    status: input.status ?? "active",
  };
  if (input.favourite !== undefined) payload.favourite = input.favourite;

  const { data, error } = await db()
    .from("workspace_memberships")
    .upsert(payload, { onConflict: "workspace_id,user_id" })
    .select("*, workspaces(name, organisation_id)")
    .maybeSingle();
  if (error) fail("upsertWorkspaceMembership", error);
  return toWorkspaceMembership(data as Row);
}

export async function removeWorkspaceMembership(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const { error } = await db()
    .from("workspace_memberships")
    .update({ status: "removed" })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) fail("removeWorkspaceMembership", error);
}

export async function removeAllWorkspaceMembershipsInOrganisation(
  organisationId: string,
  userId: string,
): Promise<void> {
  const workspaces = await listWorkspacesForOrganisations([organisationId]);
  if (workspaces.length === 0) return;
  const { error } = await db()
    .from("workspace_memberships")
    .update({ status: "removed" })
    .eq("user_id", userId)
    .in(
      "workspace_id",
      workspaces.map((workspace) => workspace.id),
    );
  if (error) fail("removeAllWorkspaceMembershipsInOrganisation", error);
}

/* ------------------------- organisation memberships ----------------------- */

export async function listOrganisationMembers(organisationId: string): Promise<MemberView[]> {
  const { data, error } = await db()
    .from("organisation_memberships")
    .select("*")
    .eq("organisation_id", organisationId)
    .neq("status", "removed");
  if (error) fail("listOrganisationMembers", error);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const { data: profiles, error: profileError } = await db()
    .from("identity_profiles")
    .select("id, email, display_name, profile_image")
    .in(
      "id",
      rows.map((row) => row.user_id),
    );
  if (profileError) fail("listOrganisationMembers.profiles", profileError);
  const byId = new Map((profiles ?? []).map((row: Row) => [row.id, row]));

  const workspaces = await listWorkspacesForOrganisations([organisationId]);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const workspaceMemberships = await listWorkspaceMembershipsForWorkspaces([
    ...workspaceById.keys(),
  ]);

  return rows.map((row) => {
    const profile = byId.get(row.user_id) as Row | undefined;
    return {
      membershipId: row.id,
      userId: row.user_id,
      email: profile?.email ?? "",
      displayName: profile?.display_name ?? profile?.email ?? "Unknown user",
      profileImage: profile?.profile_image ?? null,
      organisationId: row.organisation_id,
      role: row.role as PlatformRole,
      status: row.status as TenantMembershipStatus,
      joinedAt: row.joined_at,
      workspaces: workspaceMemberships
        .filter((membership) => membership.userId === row.user_id)
        .map((membership) => ({
          id: membership.workspaceId,
          name: workspaceById.get(membership.workspaceId)?.name ?? "",
          role: membership.role,
        })),
    } satisfies MemberView;
  });
}

export async function findOrganisationMembership(
  userId: string,
  organisationId: string,
): Promise<{ id: string; role: PlatformRole; status: TenantMembershipStatus } | null> {
  const { data, error } = await db()
    .from("organisation_memberships")
    .select("id, role, status")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) fail("findOrganisationMembership", error);
  return data ? { id: data.id, role: data.role, status: data.status } : null;
}

export async function findMembershipById(
  membershipId: string,
): Promise<{ id: string; userId: string; organisationId: string; role: PlatformRole; status: TenantMembershipStatus } | null> {
  const { data, error } = await db()
    .from("organisation_memberships")
    .select("id, user_id, organisation_id, role, status")
    .eq("id", membershipId)
    .maybeSingle();
  if (error) fail("findMembershipById", error);
  return data
    ? {
        id: data.id,
        userId: data.user_id,
        organisationId: data.organisation_id,
        role: data.role,
        status: data.status,
      }
    : null;
}

export async function upsertOrganisationMembership(input: {
  userId: string;
  organisationId: string;
  role: PlatformRole;
  status: TenantMembershipStatus;
  invitedBy?: string | null;
}): Promise<void> {
  const { error } = await db()
    .from("organisation_memberships")
    .upsert(
      {
        user_id: input.userId,
        organisation_id: input.organisationId,
        role: input.role,
        status: input.status,
        invited_by: input.invitedBy ?? null,
      },
      { onConflict: "user_id,organisation_id" },
    );
  if (error) fail("upsertOrganisationMembership", error);
}

/* -------------------------------- settings -------------------------------- */

export async function getOrganisationSettingsRow(organisationId: string): Promise<Row | null> {
  const { data, error } = await db()
    .from("organisation_settings")
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) fail("getOrganisationSettingsRow", error);
  return data ?? null;
}

export async function upsertOrganisationSettingsRow(
  organisationId: string,
  patch: Record<string, unknown>,
): Promise<Row> {
  const { data, error } = await db()
    .from("organisation_settings")
    .upsert({ organisation_id: organisationId, ...patch }, { onConflict: "organisation_id" })
    .select("*")
    .maybeSingle();
  if (error) fail("upsertOrganisationSettingsRow", error);
  return data as Row;
}

export async function getWorkspaceSettingsRow(workspaceId: string): Promise<Row | null> {
  const { data, error } = await db()
    .from("workspace_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) fail("getWorkspaceSettingsRow", error);
  return data ?? null;
}

export async function upsertWorkspaceSettingsRow(
  workspaceId: string,
  organisationId: string,
  patch: Record<string, unknown>,
): Promise<Row> {
  const { data, error } = await db()
    .from("workspace_settings")
    .upsert(
      { workspace_id: workspaceId, organisation_id: organisationId, ...patch },
      { onConflict: "workspace_id" },
    )
    .select("*")
    .maybeSingle();
  if (error) fail("upsertWorkspaceSettingsRow", error);
  return data as Row;
}

export type { OrganisationSettings, WorkspaceSettings };

/* ------------------------------- visit history ---------------------------- */

export async function listVisits(userId: string): Promise<WorkspaceVisit[]> {
  const { data, error } = await db()
    .from("workspace_visits")
    .select("*")
    .eq("user_id", userId)
    .order("last_visited_at", { ascending: false })
    .limit(50);
  if (error) fail("listVisits", error);
  return (data ?? []).map((row: Row) => ({
    workspaceId: row.workspace_id,
    organisationId: row.organisation_id,
    visitCount: row.visit_count ?? 1,
    lastVisitedAt: row.last_visited_at,
  }));
}

export async function recordVisit(input: {
  userId: string;
  workspaceId: string;
  organisationId: string;
}): Promise<void> {
  const { data, error } = await db()
    .from("workspace_visits")
    .select("id, visit_count")
    .eq("user_id", input.userId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (error) fail("recordVisit.read", error);

  const payload = {
    user_id: input.userId,
    workspace_id: input.workspaceId,
    organisation_id: input.organisationId,
    visit_count: (data?.visit_count ?? 0) + 1,
    last_visited_at: new Date().toISOString(),
  };
  const { error: writeError } = await db()
    .from("workspace_visits")
    .upsert(payload, { onConflict: "user_id,workspace_id" });
  if (writeError) fail("recordVisit.write", writeError);
}

/* ------------------------------ invitations ------------------------------- */

export async function listInvitations(organisationId: string): Promise<TenantInvitation[]> {
  const { data, error } = await db()
    .from("organisation_invitations")
    .select("*, organisations(name)")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });
  if (error) fail("listInvitations", error);
  return (data ?? []).map(toInvitation);
}

export async function insertInvitation(input: Record<string, unknown>): Promise<TenantInvitation> {
  const { data, error } = await db()
    .from("organisation_invitations")
    .insert(input)
    .select("*, organisations(name)")
    .maybeSingle();
  if (error) fail("insertInvitation", error);
  return toInvitation(data as Row);
}

export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<TenantInvitation | null> {
  const { data, error } = await db()
    .from("organisation_invitations")
    .select("*, organisations(name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) fail("findInvitationByTokenHash", error);
  return data ? toInvitation(data) : null;
}

export async function findInvitationById(id: string): Promise<TenantInvitation | null> {
  const { data, error } = await db()
    .from("organisation_invitations")
    .select("*, organisations(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("findInvitationById", error);
  return data ? toInvitation(data) : null;
}

export async function updateInvitationRow(
  id: string,
  patch: Record<string, unknown>,
): Promise<TenantInvitation> {
  const { data, error } = await db()
    .from("organisation_invitations")
    .update(patch)
    .eq("id", id)
    .select("*, organisations(name)")
    .maybeSingle();
  if (error) fail("updateInvitationRow", error);
  if (!data) throw TenantErrors.notFound("Invitation not found.");
  return toInvitation(data);
}

/* ------------------------------ notifications ----------------------------- */

export async function insertNotifications(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from("platform_notifications").insert(rows);
  if (error) console.error("[tenancy-repository] insertNotifications", error);
}

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<PlatformNotification[]> {
  const { data, error } = await db()
    .from("platform_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listNotifications", error);
  return (data ?? []).map(toNotification);
}

export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  const query = db()
    .from("platform_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  const { error } = ids.length > 0 ? await query.in("id", ids) : await query;
  if (error) fail("markNotificationsRead", error);
}

/* --------------------------------- audit ---------------------------------- */

export async function insertAudit(row: Record<string, unknown>): Promise<void> {
  const { error } = await db().from("organisation_audit_events").insert(row);
  if (error) console.error("[tenancy-repository] insertAudit", error);
}

export async function listAudit(filter: {
  organisationId?: string;
  workspaceId?: string;
  limit?: number;
}): Promise<TenantAuditEvent[]> {
  let query = db()
    .from("organisation_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);
  if (filter.organisationId) query = query.eq("organisation_id", filter.organisationId);
  if (filter.workspaceId) query = query.eq("workspace_id", filter.workspaceId);
  const { data, error } = await query;
  if (error) fail("listAudit", error);
  return (data ?? []).map(toAuditEvent);
}
