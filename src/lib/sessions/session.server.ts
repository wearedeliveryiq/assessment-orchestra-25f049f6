import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { notify } from "@/lib/tenancy/notifications.server";
import * as tenancyRepo from "@/lib/tenancy/repository.server";

import { loadSession, permissionsFor, requireCreateAccess, scopedOrganisationIds } from "./access.server";
import { auditSessionEvent, type RequestContext } from "./audit.server";
import { hydrate } from "./collaboration.server";
import { diffChanges, listHistory, recordHistory } from "./history.server";
import * as repo from "./repository.server";
import { dueStateOf, SessionErrors } from "./status";
import { listTimeline, recentActivity } from "./timeline.server";
import type {
  AssessmentSession,
  AssessmentSessionView,
  CreateSessionInput,
  SessionDashboard,
  SessionDetail,
  SessionSearchFilter,
  SessionStatus,
  UpdateSessionInput,
} from "./types";
import {
  optionalIsoDate,
  optionalPriority,
  optionalTags,
  optionalText,
  optionalUuid,
  parseStatuses,
  parseUserIds,
  requireText,
  requireUuid,
} from "./validation";

/**
 * AssessmentSessionService — creation, retrieval, search, dashboards and
 * reassessment. Deliberately knows nothing about questions, scoring or
 * knowledge-pack internals: it only records which pack a session executes.
 */

/* ------------------------------- view mapping ------------------------------ */

async function toViews(
  identity: AuthenticatedIdentity,
  sessions: AssessmentSession[],
): Promise<AssessmentSessionView[]> {
  if (sessions.length === 0) return [];

  const users = await repo.resolveUsers(sessions.flatMap((s) => [s.ownerId, s.assignedTo]));
  const workspaceIds = [...new Set(sessions.map((s) => s.workspaceId))];
  const organisationIds = [...new Set(sessions.map((s) => s.organisationId))];

  const workspaces = new Map<string, string>();
  const organisations = new Map<string, string>();
  await Promise.all([
    ...workspaceIds.map(async (id) => {
      const workspace = await tenancyRepo.getWorkspace(id);
      if (workspace) workspaces.set(id, workspace.name);
    }),
    ...organisationIds.map(async (id) => {
      const organisation = await tenancyRepo.getOrganisation(id);
      if (organisation) organisations.set(id, organisation.name);
    }),
  ]);

  const isAdmin = identity.roles.includes("platform_admin");
  return sessions.map((session) => {
    const dueState = dueStateOf(session.dueDate, session.status);
    const isOwner = session.ownerId === identity.user.id;
    const isAssignee = session.assignedTo === identity.user.id;
    return {
      ...session,
      owner: users.get(session.ownerId) ?? null,
      assignee: session.assignedTo ? (users.get(session.assignedTo) ?? null) : null,
      workspaceName: workspaces.get(session.workspaceId) ?? "Workspace",
      organisationName: organisations.get(session.organisationId) ?? "Organisation",
      dueState,
      isOverdue: dueState === "overdue",
      canEdit: isAdmin || isOwner || isAssignee,
      canManage: isAdmin || isOwner,
    };
  });
}

/* --------------------------------- create ---------------------------------- */

export async function createSession(
  identity: AuthenticatedIdentity,
  input: CreateSessionInput,
  ctx?: RequestContext,
): Promise<AssessmentSessionView> {
  const workspaceId = requireUuid(input.workspaceId, "Workspace");
  const access = await requireCreateAccess(identity, workspaceId);
  const organisationId = access.organisation.id;
  if (input.organisationId && requireUuid(input.organisationId, "Organisation") !== organisationId) {
    throw SessionErrors.validation("The workspace does not belong to that organisation.");
  }

  const knowledgePackId = requireText(input.knowledgePackId, "Knowledge pack", 120);
  const name = requireText(input.name, "Assessment name", 160);
  const assignedTo = optionalUuid(input.assignedTo, "Assignee");
  const reviewerIds = parseUserIds(input.reviewerIds, "Reviewer");
  const contributorIds = parseUserIds(input.contributorIds, "Contributor");

  const session = await repo.insertSession({
    knowledge_pack_id: knowledgePackId,
    knowledge_pack_version: optionalText(input.knowledgePackVersion, "Pack version", 40) ?? "",
    organisation_id: organisationId,
    workspace_id: workspaceId,
    owner_id: identity.user.id,
    assigned_to: assignedTo,
    name,
    description: optionalText(input.description, "Description") ?? "",
    priority: optionalPriority(input.priority) ?? "medium",
    tags: optionalTags(input.tags) ?? [],
    metadata: input.metadata ?? {},
    due_date: optionalIsoDate(input.dueDate, "Due date") ?? null,
    status: assignedTo ? "assigned" : "draft",
  });

  await repo.addParticipant({
    session_id: session.id,
    user_id: identity.user.id,
    role: "owner",
    added_by: identity.user.id,
  });
  for (const userId of reviewerIds) {
    await repo.addParticipant({ session_id: session.id, user_id: userId, role: "reviewer", added_by: identity.user.id });
  }
  for (const userId of [...contributorIds, ...(assignedTo ? [assignedTo] : [])]) {
    await repo.addParticipant({ session_id: session.id, user_id: userId, role: "contributor", added_by: identity.user.id });
  }

  recordHistory({
    sessionId: session.id,
    version: session.version,
    actor: identity,
    changes: [{ changeType: "created", field: "status", nextValue: session.status }],
  });
  auditSessionEvent({
    session,
    eventType: "session.created",
    actor: identity,
    summary: "Assessment created",
    metadata: { knowledgePackId, assignedTo, reviewerIds },
    context: ctx,
  });
  if (assignedTo) {
    notify({
      recipients: [assignedTo],
      module: "assessment",
      eventType: "assessment.assigned",
      title: "An assessment was assigned to you",
      body: name,
      organisationId,
      workspaceId,
      metadata: { sessionId: session.id },
    });
  }

  return (await toViews(identity, [session]))[0];
}

/* ---------------------------------- read ----------------------------------- */

export async function getSessionDetail(
  identity: AuthenticatedIdentity,
  sessionId: string,
): Promise<SessionDetail> {
  const context = await loadSession(identity, requireUuid(sessionId, "Session"));
  const [view] = await toViews(identity, [context.session]);
  const permissions = permissionsFor(identity, context.session, context.access, context.participants);

  const [participants, timeline, history, lineage] = await Promise.all([
    hydrate(context.participants),
    listTimeline(sessionId, { limit: 50 }),
    listHistory(sessionId, 100),
    repo.listLineage(context.session.rootSessionId),
  ]);

  return {
    session: { ...view, canEdit: permissions.canEdit, canManage: permissions.canManage },
    participants,
    timeline,
    history,
    lineage,
  };
}

export async function updateSession(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: UpdateSessionInput,
  ctx?: RequestContext,
): Promise<AssessmentSessionView> {
  const { session } = await loadSession(identity, requireUuid(sessionId, "Session"), {
    write: true,
    require: "edit",
  });

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = requireText(input.name, "Assessment name", 160);
  const description = optionalText(input.description, "Description");
  if (description !== undefined) patch.description = description;
  const priority = optionalPriority(input.priority);
  if (priority) patch.priority = priority;
  const dueDate = optionalIsoDate(input.dueDate, "Due date");
  if (dueDate !== undefined) patch.due_date = dueDate;
  const tags = optionalTags(input.tags);
  if (tags) patch.tags = tags;
  if (input.metadata !== undefined) patch.metadata = { ...session.metadata, ...input.metadata };
  if (input.runtimeSessionId !== undefined) {
    patch.runtime_session_id = optionalUuid(input.runtimeSessionId, "Runtime session");
  }
  if (input.progress !== undefined) {
    const progress = Number(input.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw SessionErrors.validation("Progress must be between 0 and 100.");
    }
    patch.progress = Math.round(progress);
  }

  if (Object.keys(patch).length === 0) return (await toViews(identity, [session]))[0];

  const updated = await repo.updateSession(sessionId, patch, session.updatedAt);
  recordHistory({
    sessionId,
    version: updated.version,
    actor: identity,
    changes: diffChanges(
      session as unknown as Record<string, unknown>,
      {
        name: updated.name,
        description: updated.description,
        priority: updated.priority,
        dueDate: updated.dueDate,
        tags: updated.tags,
        progress: updated.progress,
      } as Record<string, unknown>,
      "updated",
    ),
  });
  auditSessionEvent({
    session: updated,
    eventType: "session.updated",
    actor: identity,
    summary: "Assessment details updated",
    metadata: { fields: Object.keys(patch) },
    context: ctx,
  });

  return (await toViews(identity, [updated]))[0];
}

/* --------------------------------- search ---------------------------------- */

export async function searchSessions(
  identity: AuthenticatedIdentity,
  filter: SessionSearchFilter & { assignedToMe?: boolean; ownedByMe?: boolean } = {},
): Promise<AssessmentSessionView[]> {
  const organisationIds = await scopedOrganisationIds(identity, filter.organisationId);
  const sessions = await repo.searchSessions({
    ...filter,
    organisationId: undefined,
    organisationIds,
    status: parseStatuses(filter.status),
    assignedTo: filter.assignedToMe ? identity.user.id : filter.assignedTo,
    ownerId: filter.ownedByMe ? identity.user.id : filter.ownerId,
  });
  return toViews(identity, sessions);
}

export async function getDashboard(
  identity: AuthenticatedIdentity,
  filter: { organisationId?: string; workspaceId?: string } = {},
): Promise<SessionDashboard> {
  const views = await searchSessions(identity, {
    ...filter,
    includeArchived: true,
    limit: 200,
  });

  const counts = {
    draft: 0,
    assigned: 0,
    in_progress: 0,
    paused: 0,
    awaiting_review: 0,
    completed: 0,
    archived: 0,
    overdue: 0,
    total: views.length,
  } as SessionDashboard["counts"];

  for (const view of views) {
    counts[view.status] = (counts[view.status] ?? 0) + 1;
    if (view.isOverdue) counts.overdue += 1;
  }

  const of = (status: SessionStatus | SessionStatus[]) => {
    const list = Array.isArray(status) ? status : [status];
    return views.filter((view) => list.includes(view.status));
  };

  const active = views.filter((view) => view.status !== "archived");
  const recentIds = active.slice(0, 25).map((view) => view.id);

  return {
    counts,
    assignedToMe: active.filter((view) => view.assignedTo === identity.user.id),
    drafts: of(["draft", "assigned"]),
    inProgress: of(["in_progress", "paused"]),
    awaitingReview: of("awaiting_review"),
    completed: of("completed"),
    overdue: active.filter((view) => view.isOverdue),
    recentActivity: await recentActivity(recentIds, 20),
  };
}

/* ------------------------------- reassessment ------------------------------ */

/**
 * Creates the next version of a completed assessment. The previous session and
 * its responses are never touched: the new session links back through
 * `parentSessionId` and shares a `rootSessionId` so the whole lineage can be
 * compared over time.
 */
export async function reassess(
  identity: AuthenticatedIdentity,
  sessionId: string,
  input: { name?: string; dueDate?: string | null; assignedTo?: string | null; note?: string } = {},
  ctx?: RequestContext,
): Promise<AssessmentSessionView> {
  const { session } = await loadSession(identity, requireUuid(sessionId, "Session"), {
    require: "manage",
  });
  if (session.status !== "completed" && session.status !== "archived") {
    throw SessionErrors.conflict("Only a completed assessment can be reassessed.");
  }

  const existing = await repo.findOpenReassessment(session.id);
  if (existing) {
    throw SessionErrors.conflict("A reassessment of this assessment is already in progress.");
  }

  const version = (await repo.countLineage(session.rootSessionId)) + 1;
  const assignedTo = optionalUuid(input.assignedTo ?? session.assignedTo, "Assignee");

  const next = await repo.insertSession({
    knowledge_pack_id: session.knowledgePackId,
    knowledge_pack_version: session.knowledgePackVersion,
    organisation_id: session.organisationId,
    workspace_id: session.workspaceId,
    owner_id: identity.user.id,
    assigned_to: assignedTo,
    name: input.name?.trim() || `${session.name} (v${version})`,
    description: session.description,
    priority: session.priority,
    tags: session.tags,
    metadata: { ...session.metadata, reassessmentOf: session.id, statusBeforeArchive: undefined },
    due_date: optionalIsoDate(input.dueDate, "Due date") ?? null,
    status: assignedTo ? "assigned" : "draft",
    version,
    parent_session_id: session.id,
    root_session_id: session.rootSessionId,
  });

  await repo.addParticipant({
    session_id: next.id,
    user_id: identity.user.id,
    role: "owner",
    added_by: identity.user.id,
  });
  for (const participant of await repo.listParticipants(session.id)) {
    if (participant.role === "owner") continue;
    await repo.addParticipant({
      session_id: next.id,
      user_id: participant.userId,
      role: participant.role,
      added_by: identity.user.id,
    });
  }

  recordHistory({
    sessionId: next.id,
    version,
    actor: identity,
    changes: [{ changeType: "reassessment", field: "parentSessionId", nextValue: session.id }],
  });
  auditSessionEvent({
    session: next,
    eventType: "session.reassessed",
    actor: identity,
    summary: `Reassessment created from version ${session.version}`,
    metadata: { previousSessionId: session.id, version, note: input.note ?? "" },
    context: ctx,
  });
  auditSessionEvent({
    session,
    eventType: "session.reassessed",
    actor: identity,
    summary: "Reassessment started",
    metadata: { nextSessionId: next.id, version },
    context: ctx,
  });
  if (assignedTo) {
    notify({
      recipients: [assignedTo],
      module: "assessment",
      eventType: "assessment.assigned",
      title: "A reassessment was assigned to you",
      body: next.name,
      organisationId: next.organisationId,
      workspaceId: next.workspaceId,
      metadata: { sessionId: next.id },
    });
  }

  return (await toViews(identity, [next]))[0];
}

export async function getTimeline(
  identity: AuthenticatedIdentity,
  sessionId: string,
  options: { limit?: number; before?: string } = {},
) {
  await loadSession(identity, requireUuid(sessionId, "Session"));
  return listTimeline(sessionId, options);
}

export async function getHistory(
  identity: AuthenticatedIdentity,
  sessionId: string,
  limit?: number,
) {
  await loadSession(identity, requireUuid(sessionId, "Session"));
  return listHistory(sessionId, limit);
}
