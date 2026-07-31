import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";

import { loadSession } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { SessionErrors } from "./status";
import type { AssessmentSession, AssignmentInput } from "./types";
import { optionalIsoDate, optionalPriority, optionalUuid, parseUserIds } from "./validation";

/**
 * AssessmentAssignmentService — assign, reassign and unassign. Assignment moves
 * a Draft session to Assigned automatically and always notifies the new
 * assignee and reviewers.
 */

export async function assign(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: AssignmentInput,
  ctx?: RequestContext,
): Promise<AssessmentSession> {
  const { session } = await loadSession(identity, sessionId, { write: true, require: "manage" });

  const assignedTo = optionalUuid(input.assignedTo, "Assignee");
  const reviewerIds = parseUserIds(input.reviewerIds, "Reviewer");
  const dueDate = optionalIsoDate(input.dueDate, "Due date");
  const priority = optionalPriority(input.priority);

  const members = await repo.organisationMemberIds(session.organisationId);
  for (const userId of [assignedTo, ...reviewerIds].filter(Boolean) as string[]) {
    if (!members.includes(userId)) {
      throw SessionErrors.validation("Assignees must be active members of this organisation.");
    }
  }

  const isReassignment = Boolean(session.assignedTo && assignedTo && session.assignedTo !== assignedTo);
  const removed = Boolean(session.assignedTo && !assignedTo);

  const patch: Record<string, unknown> = { assigned_to: assignedTo };
  if (dueDate !== undefined) patch.due_date = dueDate;
  if (priority) patch.priority = priority;
  if (assignedTo && session.status === "draft") patch.status = "assigned";
  if (!assignedTo && session.status === "assigned") patch.status = "draft";

  const updated = await repo.updateSession(sessionId, patch, session.updatedAt);

  for (const reviewerId of reviewerIds) {
    await repo.addParticipant({
      session_id: sessionId,
      user_id: reviewerId,
      role: "reviewer",
      added_by: identity.user.id,
    });
  }
  if (assignedTo) {
    await repo.addParticipant({
      session_id: sessionId,
      user_id: assignedTo,
      role: "contributor",
      added_by: identity.user.id,
    });
  }

  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: [
      { changeType: "assignment", field: "assignedTo", previousValue: session.assignedTo, nextValue: assignedTo },
      ...(dueDate !== undefined && dueDate !== session.dueDate
        ? [{ changeType: "assignment", field: "dueDate", previousValue: session.dueDate, nextValue: dueDate }]
        : []),
      ...(priority && priority !== session.priority
        ? [{ changeType: "assignment", field: "priority", previousValue: session.priority, nextValue: priority }]
        : []),
      ...(updated.status !== session.status
        ? [{ changeType: "status", field: "status", previousValue: session.status, nextValue: updated.status }]
        : []),
    ],
  });

  const eventType = removed
    ? "session.assignment_removed"
    : isReassignment
      ? "session.reassigned"
      : "session.assigned";
  auditSessionEvent({
    session: updated,
    eventType,
    actor: identity,
    summary: removed ? "Assignment removed" : isReassignment ? "Assessment reassigned" : "Assessment assigned",
    metadata: { assignedTo, reviewerIds, dueDate, note: input.note ?? "" },
    context: ctx,
  });

  if (input.notify !== false) {
    if (assignedTo) {
      notify({
        recipients: [assignedTo],
        module: "assessment",
        eventType: isReassignment ? "assessment.reassigned" : "assessment.assigned",
        title: isReassignment ? "An assessment was reassigned to you" : "An assessment was assigned to you",
        body: session.name,
        organisationId: session.organisationId,
        workspaceId: session.workspaceId,
        metadata: { sessionId, dueDate },
      });
    }
    if (reviewerIds.length) {
      notify({
        recipients: reviewerIds,
        module: "assessment",
        eventType: "assessment.reviewer_assigned",
        title: "You were added as a reviewer",
        body: session.name,
        organisationId: session.organisationId,
        workspaceId: session.workspaceId,
        metadata: { sessionId },
      });
    }
    if (session.assignedTo && (isReassignment || removed)) {
      notify({
        recipients: [session.assignedTo],
        module: "assessment",
        eventType: "assessment.unassigned",
        title: "You are no longer assigned to an assessment",
        body: session.name,
        organisationId: session.organisationId,
        workspaceId: session.workspaceId,
        metadata: { sessionId },
      });
    }
  }

  return updated;
}

export function unassign(
  identity: AuthenticatedIdentity,
  sessionId: string,
  ctx?: RequestContext,
): Promise<AssessmentSession> {
  return assign(identity, sessionId, { assignedTo: null }, ctx);
}
