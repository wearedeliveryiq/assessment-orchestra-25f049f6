import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { requireOrganisation, requireOrganisationAdmin, requireWorkspace } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import { notify } from "./notifications.server";
import * as repo from "./repository.server";
import { TenantErrors } from "./roles";
import type { Workspace, WorkspaceStatus, WorkspaceSummary, WorkspaceType } from "./types";
import { normaliseColour, optionalText, slugify, trimmed, uniqueSlug } from "./validation";

/**
 * WorkspaceService — workspace lifecycle inside a single organisation.
 * Workspace types come from the `workspace_types` catalogue so new shapes can
 * be added without a code change.
 */

export function listWorkspaceTypes(): Promise<WorkspaceType[]> {
  return repo.listWorkspaceTypes();
}

export async function listWorkspaces(
  identity: AuthenticatedIdentity,
  filter: { organisationId?: string; query?: string; includeArchived?: boolean } = {},
): Promise<WorkspaceSummary[]> {
  const organisationIds = filter.organisationId
    ? [(await requireOrganisation(identity, filter.organisationId)).organisation.id]
    : identity.roles.includes("platform_admin")
      ? (await repo.listAllOrganisations()).map((organisation) => organisation.id)
      : identity.memberships
          .filter((membership) => membership.status === "active")
          .map((membership) => membership.organisationId);

  if (organisationIds.length === 0) return [];

  const [workspaces, visits, myMemberships] = await Promise.all([
    repo.listWorkspacesForOrganisations(organisationIds),
    repo.listVisits(identity.user.id),
    repo.listWorkspaceMembershipsForUser(identity.user.id),
  ]);

  const adminOrganisations = new Set(
    identity.memberships
      .filter(
        (membership) =>
          membership.status === "active" &&
          (membership.role === "org_admin" || membership.role === "organisation_owner"),
      )
      .map((membership) => membership.organisationId),
  );
  const isPlatformAdmin = identity.roles.includes("platform_admin");
  const membershipByWorkspace = new Map(
    myMemberships.map((membership) => [membership.workspaceId, membership]),
  );
  const visitByWorkspace = new Map(visits.map((visit) => [visit.workspaceId, visit]));

  const visible = workspaces.filter((workspace) => {
    if (workspace.visibility !== "private") return true;
    return (
      isPlatformAdmin ||
      adminOrganisations.has(workspace.organisationId) ||
      membershipByWorkspace.has(workspace.id)
    );
  });

  const counts = await memberCounts(visible.map((workspace) => workspace.id));

  return visible
    .filter((workspace) => filter.includeArchived || workspace.status === "active")
    .filter((workspace) =>
      filter.query
        ? `${workspace.name} ${workspace.description}`
            .toLowerCase()
            .includes(filter.query.toLowerCase())
        : true,
    )
    .map((workspace) => ({
      ...workspace,
      memberCount: counts.get(workspace.id) ?? 0,
      favourite: membershipByWorkspace.get(workspace.id)?.favourite ?? false,
      role: membershipByWorkspace.get(workspace.id)?.role ?? null,
      lastVisitedAt: visitByWorkspace.get(workspace.id)?.lastVisitedAt ?? null,
    }));
}

async function memberCounts(workspaceIds: string[]): Promise<Map<string, number>> {
  const memberships = await repo.listWorkspaceMembershipsForWorkspaces(workspaceIds);
  const counts = new Map<string, number>();
  for (const membership of memberships) {
    if (membership.status !== "active") continue;
    counts.set(membership.workspaceId, (counts.get(membership.workspaceId) ?? 0) + 1);
  }
  return counts;
}

export async function getWorkspaceSummary(
  identity: AuthenticatedIdentity,
  workspaceId: string,
): Promise<WorkspaceSummary> {
  const { workspace, workspaceRole } = await requireWorkspace(identity, workspaceId);
  const [counts, visits] = await Promise.all([
    memberCounts([workspaceId]),
    repo.listVisits(identity.user.id),
  ]);
  const memberships = await repo.listWorkspaceMembershipsForUser(identity.user.id);
  return {
    ...workspace,
    memberCount: counts.get(workspaceId) ?? 0,
    favourite: memberships.find((entry) => entry.workspaceId === workspaceId)?.favourite ?? false,
    role: workspaceRole,
    lastVisitedAt: visits.find((visit) => visit.workspaceId === workspaceId)?.lastVisitedAt ?? null,
  };
}

export async function createWorkspace(
  identity: AuthenticatedIdentity,
  input: {
    organisationId: unknown;
    name: unknown;
    description?: unknown;
    type?: unknown;
    colour?: unknown;
    icon?: unknown;
    visibility?: unknown;
  },
  context?: RequestContext,
): Promise<WorkspaceSummary> {
  if (typeof input.organisationId !== "string") {
    throw TenantErrors.validation("An organisation is required.");
  }
  await requireOrganisationAdmin(identity, input.organisationId);

  const name = trimmed(input.name, 120);
  if (!name) throw TenantErrors.validation("A workspace name is required.");

  const existing = await repo.findWorkspaceByName(input.organisationId, name);
  if (existing) {
    throw TenantErrors.conflict("A workspace with this name already exists in this organisation.");
  }

  const types = await repo.listWorkspaceTypes();
  const requested = optionalText(input.type, 40);
  const type = types.find((entry) => entry.code === requested)?.code ?? "custom";

  const slug = uniqueSlug(slugify(name), await repo.listWorkspaceSlugs(input.organisationId));
  const colour = normaliseColour(input.colour);

  const workspace = await repo.insertWorkspace({
    organisation_id: input.organisationId,
    name,
    slug,
    description: optionalText(input.description, 500) ?? "",
    type,
    colour,
    icon: optionalText(input.icon, 40) || "layers",
    visibility: input.visibility === "private" ? "private" : "organisation",
    created_by: identity.user.id,
  });

  await Promise.all([
    repo.upsertWorkspaceMembership({
      workspaceId: workspace.id,
      userId: identity.user.id,
      role: "workspace_manager",
    }),
    repo.upsertWorkspaceSettingsRow(workspace.id, workspace.organisationId, {
      display_name: workspace.name,
      description: workspace.description,
      colour: workspace.colour,
      icon: workspace.icon,
      visibility: workspace.visibility,
    }),
  ]);

  recordTenantEvent({
    eventType: "workspace.created",
    actor: identity,
    organisationId: workspace.organisationId,
    workspaceId: workspace.id,
    entityType: "workspace",
    entityId: workspace.id,
    summary: `Workspace "${workspace.name}" created`,
    context,
  });
  notify({
    recipients: [identity.user.id],
    eventType: "workspace.created",
    body: `${workspace.name} is ready to use.`,
    organisationId: workspace.organisationId,
    workspaceId: workspace.id,
  });

  return { ...workspace, memberCount: 1, favourite: false, role: "workspace_manager", lastVisitedAt: null };
}

export async function updateWorkspace(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  patch: Record<string, unknown>,
  context?: RequestContext,
): Promise<Workspace> {
  const access = await requireWorkspace(identity, workspaceId, { write: patch.status !== "active" });
  if (!access.canManageWorkspace) {
    throw TenantErrors.forbidden("You must manage this workspace to change it.");
  }

  const allowed: Record<string, unknown> = {};
  const name = trimmed(patch.name, 120);
  if (name && name.toLowerCase() !== access.workspace.name.toLowerCase()) {
    const clash = await repo.findWorkspaceByName(access.workspace.organisationId, name);
    if (clash) {
      throw TenantErrors.conflict("A workspace with this name already exists in this organisation.");
    }
    allowed.name = name;
  }
  const description = optionalText(patch.description, 500);
  if (description !== undefined) allowed.description = description;
  const icon = optionalText(patch.icon, 40);
  if (icon) allowed.icon = icon;
  if (patch.colour !== undefined) allowed.colour = normaliseColour(patch.colour, access.workspace.colour);
  if (patch.visibility === "private" || patch.visibility === "organisation") {
    allowed.visibility = patch.visibility;
  }
  if (patch.type !== undefined) {
    const types = await repo.listWorkspaceTypes();
    const type = types.find((entry) => entry.code === patch.type);
    if (!type) throw TenantErrors.validation("Unknown workspace type.");
    allowed.type = type.code;
  }
  if (patch.status === "active" || patch.status === "archived") {
    allowed.status = patch.status as WorkspaceStatus;
  }
  if (Object.keys(allowed).length === 0) throw TenantErrors.validation("Nothing to update.");

  const workspace = await repo.updateWorkspaceRow(workspaceId, allowed);
  const archived = allowed.status === "archived";

  recordTenantEvent({
    eventType: archived ? "workspace.updated" : "workspace.updated",
    actor: identity,
    organisationId: workspace.organisationId,
    workspaceId: workspace.id,
    entityType: "workspace",
    entityId: workspace.id,
    summary: archived
      ? `Workspace "${workspace.name}" archived`
      : `Workspace "${workspace.name}" updated`,
    metadata: { fields: Object.keys(allowed) },
    context,
  });

  if (archived) {
    const members = await repo.listWorkspaceMembers(workspaceId);
    notify({
      recipients: members.map((member) => member.userId),
      eventType: "workspace.archived",
      body: `${workspace.name} is now read-only.`,
      severity: "warning",
      organisationId: workspace.organisationId,
      workspaceId: workspace.id,
    });
  }

  return workspace;
}

export async function deleteWorkspace(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  context?: RequestContext,
): Promise<void> {
  const access = await requireWorkspace(identity, workspaceId, { write: false });
  if (!access.isAdmin) {
    throw TenantErrors.forbidden("Only an organisation administrator can delete a workspace.");
  }
  await repo.deleteWorkspaceRow(workspaceId);
  recordTenantEvent({
    eventType: "workspace.deleted",
    actor: identity,
    organisationId: access.organisation.id,
    entityType: "workspace",
    entityId: workspaceId,
    summary: `Workspace "${access.workspace.name}" deleted`,
    context,
  });
}
