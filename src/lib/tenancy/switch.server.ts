import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { requireWorkspace } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import * as repo from "./repository.server";
import { listOrganisations } from "./organisation.server";
import { listWorkspaces } from "./workspace.server";
import type { WorkspaceContext, WorkspaceSummary } from "./types";
import { orderByRecency } from "./validation";

/**
 * WorkspaceSwitchService — current workspace, recents, favourites and history.
 *
 * Switching is a data operation only: it never touches the session, so no
 * re-authentication is required and a switch costs a single write plus a
 * cached context read.
 */

const RECENT_LIMIT = 6;

/**
 * The full switcher payload. Assembled in one round trip so the selector can
 * render organisations, workspaces, favourites and recents without waterfalls.
 */
export async function workspaceContext(
  identity: AuthenticatedIdentity,
  currentWorkspaceId?: string | null,
): Promise<WorkspaceContext> {
  const [organisations, workspaces, visits] = await Promise.all([
    listOrganisations(identity),
    listWorkspaces(identity),
    repo.listVisits(identity.user.id),
  ]);

  const lastVisit = visits[0] ?? null;
  const currentId =
    (currentWorkspaceId && workspaces.some((workspace) => workspace.id === currentWorkspaceId)
      ? currentWorkspaceId
      : null) ??
    lastVisit?.workspaceId ??
    workspaces[0]?.id ??
    null;

  const current = workspaces.find((workspace) => workspace.id === currentId) ?? null;
  const recent = orderByRecency(workspaces.filter((workspace) => workspace.lastVisitedAt))
    .filter((workspace) => workspace.id !== current?.id)
    .slice(0, RECENT_LIMIT);

  return {
    currentWorkspace: current,
    organisation:
      organisations.find((organisation) => organisation.id === current?.organisationId) ?? null,
    recent,
    favourites: workspaces.filter((workspace) => workspace.favourite),
    organisations,
    workspaces,
  };
}

/** Switch the active workspace, recording history for the switcher. */
export async function switchWorkspace(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  context?: RequestContext,
): Promise<WorkspaceContext> {
  const access = await requireWorkspace(identity, workspaceId);

  await repo.recordVisit({
    userId: identity.user.id,
    workspaceId,
    organisationId: access.workspace.organisationId,
  });

  recordTenantEvent({
    eventType: "workspace.switched",
    actor: identity,
    organisationId: access.workspace.organisationId,
    workspaceId,
    entityType: "workspace",
    entityId: workspaceId,
    summary: `Switched to "${access.workspace.name}"`,
    context,
  });

  return workspaceContext(identity, workspaceId);
}

export async function recentWorkspaces(
  identity: AuthenticatedIdentity,
): Promise<WorkspaceSummary[]> {
  const { recent } = await workspaceContext(identity);
  return recent;
}
