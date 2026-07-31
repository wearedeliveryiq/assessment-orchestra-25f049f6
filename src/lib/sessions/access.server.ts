import { requireOrganisation, requireWorkspace } from "@/lib/tenancy/access.server";
import type { WorkspaceAccess } from "@/lib/tenancy/access.server";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

import * as repo from "./repository.server";
import { SessionErrors } from "./status";
import type { AssessmentSession, ParticipantRole, SessionParticipant } from "./types";

/**
 * AssessmentOwnershipService (access half) — resolves what a caller may do with
 * a session by combining platform RBAC (organisation/workspace membership) with
 * session-specific participant roles. Every service call starts here.
 */

export interface SessionPermissions {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canReview: boolean;
  isOwner: boolean;
  isAssignee: boolean;
  participantRoles: ParticipantRole[];
}

export interface SessionContext {
  session: AssessmentSession;
  access: WorkspaceAccess;
  participants: SessionParticipant[];
  permissions: SessionPermissions;
}

export function permissionsFor(
  identity: AuthenticatedIdentity,
  session: AssessmentSession,
  access: WorkspaceAccess,
  participants: SessionParticipant[],
): SessionPermissions {
  const userId = identity.user.id;
  const participantRoles = participants
    .filter((participant) => participant.userId === userId)
    .map((participant) => participant.role);

  const isOwner = session.ownerId === userId;
  const isAssignee = session.assignedTo === userId;
  const isManager = access.isAdmin || access.canManageWorkspace;
  const isContributor = participantRoles.includes("contributor");
  const isReviewer = participantRoles.includes("reviewer");

  return {
    canView: true,
    canEdit: isManager || isOwner || isAssignee || isContributor,
    canManage: isManager || isOwner,
    canReview: isManager || isOwner || isReviewer,
    isOwner,
    isAssignee,
    participantRoles,
  };
}

export async function loadSession(
  identity: AuthenticatedIdentity,
  sessionId: string,
  options: { write?: boolean; require?: "view" | "edit" | "manage" | "review" } = {},
): Promise<SessionContext> {
  const session = await repo.getSession(sessionId);
  if (!session) throw SessionErrors.notFound();

  const access = await requireWorkspace(identity, session.workspaceId, {
    // Never block reads of a session because its workspace is archived.
    write: false,
  });
  const participants = await repo.listParticipants(sessionId);
  const permissions = permissionsFor(identity, session, access, participants);

  const requirement = options.require ?? "view";
  if (requirement === "edit" && !permissions.canEdit) {
    throw SessionErrors.forbidden("You do not have permission to change this assessment.");
  }
  if (requirement === "manage" && !permissions.canManage) {
    throw SessionErrors.forbidden("Only the owner or a workspace manager can do this.");
  }
  if (requirement === "review" && !permissions.canReview) {
    throw SessionErrors.forbidden("Only a reviewer, the owner or a manager can do this.");
  }

  if (options.write && session.status === "archived") throw SessionErrors.archived();

  return { session, access, participants, permissions };
}

export async function requireCreateAccess(
  identity: AuthenticatedIdentity,
  workspaceId: string,
): Promise<WorkspaceAccess> {
  const access = await requireWorkspace(identity, workspaceId, { write: true });
  const allowed =
    access.isAdmin ||
    access.canManageWorkspace ||
    ["assessment_manager", "contributor"].includes(access.workspaceRole ?? "") ||
    ["assessment_manager", "contributor"].includes(access.role ?? "");
  if (!allowed) {
    throw SessionErrors.forbidden("You do not have permission to start assessments here.");
  }
  return access;
}

/** Organisation scope a caller may search within. */
export async function scopedOrganisationIds(
  identity: AuthenticatedIdentity,
  organisationId?: string,
): Promise<string[] | "all"> {
  if (organisationId) {
    await requireOrganisation(identity, organisationId);
    return [organisationId];
  }
  if (identity.roles.includes("platform_admin")) return "all";
  return identity.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organisationId);
}
