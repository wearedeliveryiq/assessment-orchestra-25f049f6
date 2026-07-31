import { hasPermission } from "@/lib/identity/rbac";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

import * as repo from "./repository.server";
import { isOrganisationAdminRole, rankOf, TenantErrors } from "./roles";
import type { Organisation, PlatformRole, Workspace } from "./types";

/**
 * TenantAccessService — the single place where tenant isolation is enforced.
 *
 * Every read and write resolves the chain
 *   organisation -> workspace -> membership -> permission
 * before any data is returned, so a caller can never reach a tenant they do
 * not belong to, regardless of which service or route they arrived through.
 */

export interface OrganisationAccess {
  organisation: Organisation;
  role: PlatformRole | null;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
}

export interface WorkspaceAccess extends OrganisationAccess {
  workspace: Workspace;
  workspaceRole: PlatformRole | null;
  canManageWorkspace: boolean;
}

function isPlatformAdmin(identity: AuthenticatedIdentity): boolean {
  return identity.roles.includes("platform_admin");
}

/** Organisation ids the caller is an active member of (platform admins: all). */
export async function accessibleOrganisationIds(
  identity: AuthenticatedIdentity,
): Promise<string[] | "all"> {
  if (isPlatformAdmin(identity)) return "all";
  return identity.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organisationId);
}

export async function requireOrganisation(
  identity: AuthenticatedIdentity,
  organisationId: string,
  options: { write?: boolean } = {},
): Promise<OrganisationAccess> {
  const organisation = await repo.getOrganisation(organisationId);
  if (!organisation) throw TenantErrors.notFound("Organisation not found.");

  const platformAdmin = isPlatformAdmin(identity);
  const membership = await repo.findOrganisationMembership(identity.user.id, organisationId);

  if (!platformAdmin) {
    // Deliberately "not found": never confirm the existence of another tenant.
    if (!membership || membership.status === "removed") {
      throw TenantErrors.notFound("Organisation not found.");
    }
    if (membership.status === "suspended") {
      throw TenantErrors.forbidden("Your membership of this organisation is suspended.");
    }
  }

  if (options.write) {
    if (organisation.status === "suspended") throw TenantErrors.organisationSuspended();
    if (organisation.status === "archived") throw TenantErrors.organisationArchived();
  }

  const role = (membership?.role as PlatformRole | undefined) ?? null;
  return {
    organisation,
    role,
    isAdmin: platformAdmin || isOrganisationAdminRole(role),
    isPlatformAdmin: platformAdmin,
  };
}

export async function requireOrganisationAdmin(
  identity: AuthenticatedIdentity,
  organisationId: string,
  options: { write?: boolean } = { write: true },
): Promise<OrganisationAccess> {
  const access = await requireOrganisation(identity, organisationId, options);
  if (!access.isAdmin) {
    throw TenantErrors.forbidden("You must be an organisation administrator to do this.");
  }
  return access;
}

export async function requireWorkspace(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  options: { write?: boolean } = {},
): Promise<WorkspaceAccess> {
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) throw TenantErrors.notFound("Workspace not found.");

  const organisationAccess = await requireOrganisation(identity, workspace.organisationId, options);
  const memberships = await repo.listWorkspaceMembershipsForUser(identity.user.id);
  const membership = memberships.find((entry) => entry.workspaceId === workspaceId);

  if (
    workspace.visibility === "private" &&
    !organisationAccess.isAdmin &&
    (!membership || membership.status !== "active")
  ) {
    throw TenantErrors.notFound("Workspace not found.");
  }
  if (membership && membership.status === "suspended") {
    throw TenantErrors.forbidden("Your access to this workspace is suspended.");
  }
  if (options.write && workspace.status === "archived") throw TenantErrors.workspaceArchived();

  const workspaceRole = membership?.role ?? null;
  return {
    ...organisationAccess,
    workspace,
    workspaceRole,
    canManageWorkspace:
      organisationAccess.isAdmin ||
      workspaceRole === "workspace_manager" ||
      (workspaceRole ? hasPermission([workspaceRole], "workspace:manage") : false),
  };
}

export function assertCanAssign(
  access: OrganisationAccess,
  target: PlatformRole,
  actorRoles: PlatformRole[],
): void {
  if (access.isPlatformAdmin) return;
  const actorRank = Math.max(
    access.role ? rankOf(access.role) : 0,
    ...actorRoles.map((role) => rankOf(role)),
  );
  if (actorRank < rankOf(target)) {
    throw TenantErrors.forbidden("You cannot assign a role broader than your own.");
  }
}
