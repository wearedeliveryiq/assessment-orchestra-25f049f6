import type { AuthenticatedIdentity } from "@/lib/identity/types";

import * as repo from "./repository.server";
import type { SessionHistoryEntry } from "./types";

/**
 * AssessmentHistoryService — immutable change log. Nothing is ever overwritten:
 * each change appends a row carrying the previous and next value plus the
 * session version it applied to, which is what future trend analysis and
 * historical comparison will read.
 */

export interface FieldChange {
  changeType: string;
  field?: string;
  previousValue?: unknown;
  nextValue?: unknown;
  metadata?: Record<string, unknown>;
}

export function recordHistory(input: {
  sessionId: string;
  version: number;
  actor?: AuthenticatedIdentity | null;
  changes: FieldChange[];
}): void {
  if (input.changes.length === 0) return;
  void repo.insertHistory(
    input.changes.map((change) => ({
      session_id: input.sessionId,
      change_type: change.changeType,
      field: change.field ?? "",
      previous_value: change.previousValue ?? null,
      next_value: change.nextValue ?? null,
      version: input.version,
      actor_id: input.actor?.user.id ?? null,
      actor_email: input.actor?.user.email ?? "",
      metadata: change.metadata ?? {},
    })),
  );
}

/** Diffs a patch against the current record so only real changes are logged. */
export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  patch: Partial<T>,
  changeType: string,
): FieldChange[] {
  return Object.entries(patch)
    .filter(([field, next]) => next !== undefined && JSON.stringify(before[field]) !== JSON.stringify(next))
    .map(([field, next]) => ({
      changeType,
      field,
      previousValue: before[field] ?? null,
      nextValue: next ?? null,
    }));
}

export function listHistory(sessionId: string, limit?: number): Promise<SessionHistoryEntry[]> {
  return repo.listHistory(sessionId, { limit });
}
