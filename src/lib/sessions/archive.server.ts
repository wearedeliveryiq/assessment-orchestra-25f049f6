import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";

import { loadSession } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { assertTransition, SessionErrors } from "./status";
import type { AssessmentSession } from "./types";

/**
 * AssessmentArchiveService — archiving is a lifecycle transition, never a
 * delete. Archived sessions stay fully readable and can be restored to the
 * status they held before archiving.
 */

export async function archive(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: { reason?: string } = {},
  ctx?: RequestContext,
): Promise<AssessmentSession> {
  const { session } = await loadSession(identity, sessionId, { require: "manage" });
  if (session.status === "archived") throw SessionErrors.conflict("This assessment is already archived.");
  assertTransition(session.status, "archived");

  const updated = await repo.updateSession(
    sessionId,
    {
      status: "archived",
      archived_at: new Date().toISOString(),
      metadata: { ...session.metadata, statusBeforeArchive: session.status },
    },
    session.updatedAt,
  );

  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: [
      { changeType: "status", field: "status", previousValue: session.status, nextValue: "archived" },
    ],
  });
  auditSessionEvent({
    session: updated,
    eventType: "session.archived",
    actor: identity,
    summary: "Assessment archived",
    metadata: { reason: input.reason ?? "", previousStatus: session.status },
    context: ctx,
  });
  notify({
    recipients: [session.ownerId, session.assignedTo ?? ""].filter(Boolean),
    module: "assessment",
    eventType: "assessment.archived",
    title: "Assessment archived",
    body: session.name,
    organisationId: session.organisationId,
    workspaceId: session.workspaceId,
    metadata: { sessionId },
  });

  return updated;
}

export async function restore(
  identity: AuthenticatedIdentity,
  sessionId: string,
  ctx?: RequestContext,
): Promise<AssessmentSession> {
  const { session } = await loadSession(identity, sessionId, { require: "manage" });
  if (session.status !== "archived") throw SessionErrors.conflict("This assessment is not archived.");

  const previous = (session.metadata.statusBeforeArchive as string) ?? "draft";
  const target = previous === "archived" ? "draft" : previous;

  const updated = await repo.updateSession(
    sessionId,
    { status: target, archived_at: null },
    session.updatedAt,
  );

  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: [{ changeType: "status", field: "status", previousValue: "archived", nextValue: target }],
  });
  auditSessionEvent({
    session: updated,
    eventType: "session.restored",
    actor: identity,
    summary: "Assessment restored from archive",
    metadata: { status: target },
    context: ctx,
  });

  return updated;
}
