import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";

import { loadSession } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { assertTransition, SessionErrors } from "./status";
import type { AssessmentSession, SessionStatus } from "./types";

/**
 * AssessmentStatusService — the only place that mutates `status`.
 *
 * Every entry point validates the transition against the lifecycle table, keeps
 * the lifecycle timestamps (`startedAt`, `pausedAt`, `completedAt`) consistent
 * and writes both a history entry and an audit/timeline event.
 */

interface TransitionOptions {
  reason?: string;
  metadata?: Record<string, unknown>;
  ctx?: RequestContext;
  require?: "edit" | "manage" | "review";
}

const EVENT: Partial<Record<SessionStatus, string>> = {
  in_progress: "session.started",
  paused: "session.paused",
  awaiting_review: "session.submitted_for_review",
  completed: "session.completed",
};

const SUMMARY: Record<SessionStatus, string> = {
  draft: "Returned to draft",
  assigned: "Assigned",
  in_progress: "Assessment started",
  paused: "Assessment paused",
  awaiting_review: "Submitted for review",
  completed: "Assessment completed",
  archived: "Assessment archived",
};

export async function changeStatus(
  identity: AuthenticatedIdentity,
  sessionId: string,
  target: SessionStatus,
  options: TransitionOptions = {},
): Promise<AssessmentSession> {
  const { session } = await loadSession(identity, sessionId, {
    write: true,
    require: options.require ?? "edit",
  });

  if (session.status === target) {
    throw SessionErrors.conflict(`This assessment is already ${target.replace("_", " ")}.`);
  }
  assertTransition(session.status, target);

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: target };

  if (target === "in_progress") {
    if (!session.startedAt) patch.started_at = now;
    patch.paused_at = null;
  }
  if (target === "paused") patch.paused_at = now;
  if (target === "completed") patch.completed_at = now;
  if (target !== "completed" && session.completedAt) patch.completed_at = null;

  const updated = await repo.updateSession(sessionId, patch, session.updatedAt);

  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: [
      {
        changeType: "status",
        field: "status",
        previousValue: session.status,
        nextValue: target,
        metadata: { reason: options.reason ?? "" },
      },
    ],
  });

  const resumed = session.status === "paused" && target === "in_progress";
  auditSessionEvent({
    session: updated,
    eventType: resumed ? "session.resumed" : (EVENT[target] ?? "session.status_changed"),
    actor: identity,
    summary: resumed ? "Assessment resumed" : SUMMARY[target],
    metadata: { from: session.status, to: target, reason: options.reason ?? "", ...(options.metadata ?? {}) },
    context: options.ctx,
  });

  if (target === "completed") {
    notify({
      recipients: [updated.ownerId, updated.assignedTo ?? ""].filter(Boolean),
      module: "assessment",
      eventType: "assessment.completed",
      title: "Assessment completed",
      body: updated.name,
      organisationId: updated.organisationId,
      workspaceId: updated.workspaceId,
      metadata: { sessionId },
    });
  }

  return updated;
}

export const start = (i: AuthenticatedIdentity, id: string, ctx?: RequestContext) =>
  changeStatus(i, id, "in_progress", { ctx });

export const pause = (i: AuthenticatedIdentity, id: string, reason?: string, ctx?: RequestContext) =>
  changeStatus(i, id, "paused", { reason, ctx });

export const resume = (i: AuthenticatedIdentity, id: string, ctx?: RequestContext) =>
  changeStatus(i, id, "in_progress", { ctx });

export const submitForReview = (i: AuthenticatedIdentity, id: string, ctx?: RequestContext) =>
  changeStatus(i, id, "awaiting_review", { ctx });

export const complete = (i: AuthenticatedIdentity, id: string, ctx?: RequestContext) =>
  changeStatus(i, id, "completed", { ctx, require: "review" });
