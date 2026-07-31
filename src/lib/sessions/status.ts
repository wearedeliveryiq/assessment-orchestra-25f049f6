/**
 * AssessmentStatusService — the configurable lifecycle state machine.
 *
 * Every transition in the platform funnels through `assertTransition`, so the
 * legal lifecycle is described in exactly one table and can be extended (or
 * replaced per knowledge pack in future) without touching call sites.
 */

import { IdentityError } from "@/lib/identity/errors";

import type { DueState, SessionStatus } from "./types";

export { IdentityError as SessionError };

export const SessionErrors = {
  validation: (message: string) => new IdentityError("validation_failed", message, 400),
  notFound: (message = "Assessment session not found.") =>
    new IdentityError("not_found", message, 404),
  forbidden: (message = "You do not have access to this assessment session.") =>
    new IdentityError("forbidden", message, 403),
  conflict: (message: string) => new IdentityError("conflict", message, 409),
  archived: () =>
    new IdentityError(
      "session_archived",
      "This assessment session is archived and read-only. Restore it first.",
      409,
    ),
  invalidTransition: (from: SessionStatus, to: SessionStatus) =>
    new IdentityError(
      "invalid_transition",
      `An assessment cannot move from ${LABELS[from]} to ${LABELS[to]}.`,
      409,
      { from, to },
    ),
  concurrentUpdate: () =>
    new IdentityError(
      "concurrent_update",
      "This assessment was changed by someone else. Reload and try again.",
      409,
    ),
  internal: (detail?: unknown) =>
    new IdentityError("internal_error", "Something went wrong. Please try again.", 500, detail),
};

export const LABELS: Record<SessionStatus, string> = {
  draft: "Draft",
  assigned: "Assigned",
  in_progress: "In Progress",
  paused: "Paused",
  awaiting_review: "Awaiting Review",
  completed: "Completed",
  archived: "Archived",
};

/** Declarative lifecycle: status -> statuses reachable from it. */
export const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["assigned", "in_progress", "archived"],
  assigned: ["in_progress", "draft", "archived"],
  in_progress: ["paused", "awaiting_review", "completed", "archived"],
  paused: ["in_progress", "awaiting_review", "archived"],
  awaiting_review: ["in_progress", "completed", "archived"],
  completed: ["archived", "awaiting_review"],
  archived: ["draft", "in_progress", "completed"],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) throw SessionErrors.invalidTransition(from, to);
}

export const ACTIVE_STATUSES: SessionStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "paused",
  "awaiting_review",
];

export function isTerminal(status: SessionStatus): boolean {
  return status === "completed" || status === "archived";
}

const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000;

export function dueStateOf(
  dueDate: string | null,
  status: SessionStatus,
  now: number = Date.now(),
): DueState {
  if (status === "completed" || status === "archived") return "completed";
  if (!dueDate) return "none";
  const due = Date.parse(dueDate);
  if (Number.isNaN(due)) return "none";
  if (due < now) return "overdue";
  return due - now <= DUE_SOON_MS ? "due_soon" : "scheduled";
}
