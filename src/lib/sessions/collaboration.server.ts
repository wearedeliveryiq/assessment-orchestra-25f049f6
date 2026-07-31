import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";

import { loadSession } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { SessionErrors } from "./status";
import { requireParticipantRole, requireUuid } from "./validation";
import type { ParticipantRole, SessionParticipant } from "./types";

/**
 * AssessmentCollaborationService — owner, reviewers, contributors and observers.
 * Session-specific roles sit *on top of* platform RBAC: a contributor added here
 * can edit this session only, and never gains organisation-wide rights.
 */

export async function listParticipants(
  identity: AuthenticatedIdentity,
  sessionId: string,
): Promise<SessionParticipant[]> {
  const context = await loadSession(identity, sessionId);
  return hydrate(context.participants);
}

export async function hydrate(participants: SessionParticipant[]): Promise<SessionParticipant[]> {
  const users = await repo.resolveUsers(participants.map((participant) => participant.userId));
  return participants.map((participant) => ({
    ...participant,
    user: users.get(participant.userId) ?? null,
  }));
}

export async function addParticipant(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: { userId: unknown; role: unknown },
  ctx?: RequestContext,
): Promise<SessionParticipant[]> {
  const userId = requireUuid(input.userId, "User");
  const role = requireParticipantRole(input.role);
  if (role === "owner") {
    throw SessionErrors.validation("Use the ownership transfer action to change the owner.");
  }

  const { session } = await loadSession(identity, sessionId, { write: true, require: "manage" });
  const members = await repo.organisationMemberIds(session.organisationId);
  if (!members.includes(userId)) {
    throw SessionErrors.validation("That person is not an active member of this organisation.");
  }

  await repo.addParticipant({
    session_id: sessionId,
    user_id: userId,
    role,
    added_by: identity.user.id,
  });

  recordHistory({
    sessionId,
    version: session.version,
    actor: identity,
    changes: [{ changeType: "participant.added", field: role, nextValue: userId }],
  });
  auditSessionEvent({
    session,
    eventType: "session.participant_added",
    actor: identity,
    summary: `${role === "reviewer" ? "Reviewer" : role === "contributor" ? "Contributor" : "Observer"} added`,
    metadata: { userId, role },
    context: ctx,
  });
  notify({
    recipients: [userId],
    module: "assessment",
    eventType: role === "reviewer" ? "assessment.reviewer_assigned" : "assessment.participant_added",
    title: role === "reviewer" ? "You were added as a reviewer" : "You were added to an assessment",
    body: session.name,
    organisationId: session.organisationId,
    workspaceId: session.workspaceId,
    metadata: { sessionId, role },
  });

  return hydrate(await repo.listParticipants(sessionId));
}

export async function removeParticipant(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: { userId: unknown; role?: unknown },
  ctx?: RequestContext,
): Promise<SessionParticipant[]> {
  const userId = requireUuid(input.userId, "User");
  const role = input.role ? requireParticipantRole(input.role) : undefined;
  const { session } = await loadSession(identity, sessionId, { write: true, require: "manage" });

  if (userId === session.ownerId && (!role || role === "owner")) {
    throw SessionErrors.validation("The owner cannot be removed. Transfer ownership instead.");
  }

  await repo.removeParticipant(sessionId, userId, role as ParticipantRole | undefined);
  recordHistory({
    sessionId,
    version: session.version,
    actor: identity,
    changes: [{ changeType: "participant.removed", field: role ?? "all", previousValue: userId }],
  });
  auditSessionEvent({
    session,
    eventType: "session.participant_removed",
    actor: identity,
    summary: "Participant removed",
    metadata: { userId, role: role ?? "all" },
    context: ctx,
  });

  return hydrate(await repo.listParticipants(sessionId));
}
