import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";

import { loadSession } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { SessionErrors } from "./status";
import type { AssessmentSession } from "./types";
import { requireUuid } from "./validation";

/**
 * AssessmentOwnershipService — transfers the authoritative owner of a session.
 * Only the current owner, an organisation admin or a workspace manager may do
 * this; the previous owner is retained as a contributor so history stays intact.
 */

export async function transferOwnership(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: { ownerId: unknown; note?: string },
  ctx?: RequestContext,
): Promise<AssessmentSession> {
  const ownerId = requireUuid(input.ownerId, "New owner");
  const { session } = await loadSession(identity, sessionId, { write: true, require: "manage" });

  if (ownerId === session.ownerId) return session;

  const members = await repo.organisationMemberIds(session.organisationId);
  if (!members.includes(ownerId)) {
    throw SessionErrors.validation("The new owner must be an active member of this organisation.");
  }

  const updated = await repo.updateSession(sessionId, { owner_id: ownerId }, session.updatedAt);

  await repo.addParticipant({
    session_id: sessionId,
    user_id: ownerId,
    role: "owner",
    added_by: identity.user.id,
  });
  await repo.removeParticipant(sessionId, session.ownerId, "owner");
  await repo.addParticipant({
    session_id: sessionId,
    user_id: session.ownerId,
    role: "contributor",
    added_by: identity.user.id,
  });

  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: [
      { changeType: "ownership", field: "ownerId", previousValue: session.ownerId, nextValue: ownerId },
    ],
  });
  auditSessionEvent({
    session: updated,
    eventType: "session.owner_changed",
    actor: identity,
    summary: "Ownership transferred",
    metadata: { previousOwnerId: session.ownerId, ownerId, note: input.note ?? "" },
    context: ctx,
  });
  notify({
    recipients: [ownerId, session.ownerId],
    module: "assessment",
    eventType: "assessment.owner_changed",
    title: "Assessment ownership changed",
    body: session.name,
    organisationId: session.organisationId,
    workspaceId: session.workspaceId,
    metadata: { sessionId, ownerId },
  });

  return updated;
}
