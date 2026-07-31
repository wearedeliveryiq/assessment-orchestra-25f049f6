/**
 * Assessment Session domain model.
 *
 * The Assessment Session is the authoritative *business* record for a piece of
 * assessment work: who owns it, who is doing it, what state it is in and what
 * happened to it. The Assessment Runtime executes questionnaires against it and
 * the Intelligence Runtime consumes its results — neither owns its lifecycle.
 */

export const SESSION_STATUSES = [
  "draft",
  "assigned",
  "in_progress",
  "paused",
  "awaiting_review",
  "completed",
  "archived",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type SessionPriority = (typeof SESSION_PRIORITIES)[number];

export const PARTICIPANT_ROLES = ["owner", "reviewer", "contributor", "observer"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export interface AssessmentSession {
  id: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  organisationId: string;
  workspaceId: string;
  ownerId: string;
  assignedTo: string | null;
  runtimeSessionId: string | null;
  name: string;
  description: string;
  status: SessionStatus;
  priority: SessionPriority;
  tags: string[];
  metadata: Record<string, unknown>;
  progress: number;
  version: number;
  parentSessionId: string | null;
  rootSessionId: string;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  lastActivity: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: ParticipantRole;
  addedBy: string | null;
  createdAt: string;
  user: UserSummary | null;
}

export interface SessionTimelineEvent {
  id: string;
  sessionId: string;
  eventType: string;
  actorId: string | null;
  actorEmail: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  changeType: string;
  field: string;
  previousValue: unknown;
  nextValue: unknown;
  version: number;
  actorId: string | null;
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type DueState = "none" | "scheduled" | "due_soon" | "overdue" | "completed";

export interface AssessmentSessionView extends AssessmentSession {
  owner: UserSummary | null;
  assignee: UserSummary | null;
  workspaceName: string;
  organisationName: string;
  dueState: DueState;
  isOverdue: boolean;
  canEdit: boolean;
  canManage: boolean;
}

export interface SessionDetail {
  session: AssessmentSessionView;
  participants: SessionParticipant[];
  timeline: SessionTimelineEvent[];
  history: SessionHistoryEntry[];
  lineage: AssessmentSession[];
}

export interface SessionSearchFilter {
  query?: string;
  organisationId?: string;
  workspaceId?: string;
  knowledgePackId?: string;
  status?: SessionStatus[];
  ownerId?: string;
  assignedTo?: string;
  tags?: string[];
  dueBefore?: string;
  dueAfter?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SessionDashboard {
  counts: Record<SessionStatus | "overdue" | "total", number>;
  assignedToMe: AssessmentSessionView[];
  drafts: AssessmentSessionView[];
  inProgress: AssessmentSessionView[];
  awaitingReview: AssessmentSessionView[];
  completed: AssessmentSessionView[];
  overdue: AssessmentSessionView[];
  recentActivity: SessionTimelineEvent[];
}

export interface CreateSessionInput {
  knowledgePackId: string;
  knowledgePackVersion?: string;
  organisationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  priority?: SessionPriority;
  assignedTo?: string | null;
  reviewerIds?: string[];
  contributorIds?: string[];
  dueDate?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateSessionInput {
  name?: string;
  description?: string;
  priority?: SessionPriority;
  dueDate?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  runtimeSessionId?: string | null;
  progress?: number;
}

export interface AssignmentInput {
  assignedTo?: string | null;
  reviewerIds?: string[];
  dueDate?: string | null;
  priority?: SessionPriority;
  notify?: boolean;
  note?: string;
}

export type SessionEventType =
  | "session.created"
  | "session.updated"
  | "session.assigned"
  | "session.reassigned"
  | "session.assignment_removed"
  | "session.owner_changed"
  | "session.status_changed"
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.submitted_for_review"
  | "session.completed"
  | "session.archived"
  | "session.restored"
  | "session.reassessed"
  | "session.participant_added"
  | "session.participant_removed"
  | "session.comment";
