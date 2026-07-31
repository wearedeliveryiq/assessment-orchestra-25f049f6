import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { requireOrganisation, requireWorkspace } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import { notify } from "./notifications.server";
import * as repo from "./repository.server";
import { isWorkspaceRole, TenantErrors } from "./roles";
import type { MemberView, PlatformRole, WorkspaceMembership } from "./types";

/**
 * WorkspaceMembershipService — who belongs to a workspace and in which role.
 * Organisation membership is a precondition: a person can never join a
 * workspace in an organisation they are not part of.
 */

export interface WorkspaceMemberView extends WorkspaceMembership {
  email: string;
  displayName: string;
  profileImage: string | null;
}

export async function listWorkspaceMembers(
  identity: AuthenticatedIdentity,
  workspaceId: string,
): Promise<WorkspaceMemberView[]> {
  const access = await requireWorkspace(identity, workspaceId);
  const [memberships, organisationMembers] = await Promise.all([
    repo.listWorkspaceMembers(workspaceId),
    repo.listOrganisationMembers(access.workspace.organisationId),
  ]);
  const byUser = new Map(organisationMembers.map((member: MemberView) => [member.userId, member]));

  return memberships.map((membership) => {
    const profile = byUser.get(membership.userId);
    return {
      ...membership,
      organisationId: access.workspace.organisationId,
      email: profile?.email ?? "",
      displayName: profile?.displayName ?? "Unknown user",
      profileImage: profile?.profileImage ?? null,
    };
  });
}

export async function addWorkspaceMember(
  identity: AuthenticatedIdentity,
  input: { workspaceId: string; userId: string; role: unknown },
  context?: RequestContext,
): Promise<WorkspaceMemberView[]> {
  const access = await requireWorkspace(identity, input.workspaceId, { write: true });
  if (!access.canManageWorkspace) {
    throw TenantErrors.forbidden("You must manage this workspace to add people to it.");
  }

  const organisationMembership = await repo.findOrganisationMembership(
    input.userId,
    access.workspace.organisationId,
  );
  if (!organisationMembership || organisationMembership.status !== "active") {
    throw TenantErrors.validation("This person must be an active member of the organisation first.");
  }

  const role: PlatformRole = isWorkspaceRole(input.role) ? input.role : "contributor";
  await repo.upsertWorkspaceMembership({
    workspaceId: input.workspaceId,
    userId: input.userId,
    role,
  });

  recordTenantEvent({
    eventType: "member.added",
    actor: identity,
    organisationId: access.workspace.organisationId,
    workspaceId: input.workspaceId,
    entityType: "workspace_membership",
    entityId: input.userId,
    summary: `Member added to workspace "${access.workspace.name}"`,
    metadata: { role },
    context,
  });
  notify({
    recipients: [input.userId],
    eventType: "member.added",
    body: `You now have access to ${access.workspace.name}.`,
    organisationId: access.workspace.organisationId,
    workspaceId: input.workspaceId,
  });

  return listWorkspaceMembers(identity, input.workspaceId);
}

export async function changeWorkspaceMemberRole(
  identity: AuthenticatedIdentity,
  input: { workspaceId: string; userId: string; role: unknown },
  context?: RequestContext,
): Promise<WorkspaceMemberView[]> {
  const access = await requireWorkspace(identity, input.workspaceId, { write: true });
  if (!access.canManageWorkspace) throw TenantErrors.forbidden();
  if (!isWorkspaceRole(input.role)) throw TenantErrors.validation("Unknown workspace role.");

  await repo.upsertWorkspaceMembership({
    workspaceId: input.workspaceId,
    userId: input.userId,
    role: input.role,
  });
  recordTenantEvent({
    eventType: "role.changed",
    actor: identity,
    organisationId: access.workspace.organisationId,
    workspaceId: input.workspaceId,
    entityType: "workspace_membership",
    entityId: input.userId,
    summary: `Workspace role changed to ${input.role}`,
    context,
  });
  return listWorkspaceMembers(identity, input.workspaceId);
}

export async function removeWorkspaceMember(
  identity: AuthenticatedIdentity,
  input: { workspaceId: string; userId: string },
  context?: RequestContext,
): Promise<WorkspaceMemberView[]> {
  const access = await requireWorkspace(identity, input.workspaceId, { write: true });
  if (!access.canManageWorkspace) throw TenantErrors.forbidden();

  await repo.removeWorkspaceMembership(input.workspaceId, input.userId);
  recordTenantEvent({
    eventType: "member.removed",
    actor: identity,
    organisationId: access.workspace.organisationId,
    workspaceId: input.workspaceId,
    entityType: "workspace_membership",
    entityId: input.userId,
    summary: `Member removed from workspace "${access.workspace.name}"`,
    context,
  });
  return listWorkspaceMembers(identity, input.workspaceId);
}

/** Favourites drive the pinned section of the workspace switcher. */
export async function setWorkspaceFavourite(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  favourite: boolean,
): Promise<void> {
  const access = await requireWorkspace(identity, workspaceId);
  const existing = (await repo.listWorkspaceMembershipsForUser(identity.user.id)).find(
    (membership) => membership.workspaceId === workspaceId,
  );
  await requireOrganisation(identity, access.workspace.organisationId);
  await repo.upsertWorkspaceMembership({
    workspaceId,
    userId: identity.user.id,
    role: existing?.role ?? "read_only",
    status: existing?.status ?? "active",
    favourite,
  });
}
