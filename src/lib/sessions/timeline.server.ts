import type { AuthenticatedIdentity } from "@/lib/identity/types";

import * as repo from "./repository.server";
import type { SessionEventType, SessionTimelineEvent } from "./types";

/**
 * AssessmentTimelineService — append-only chronology of everything meaningful
 * that happens to a session. Writes are fire-and-forget so telemetry can never
 * break a lifecycle operation; reads are paginated by `before` cursor.
 */

export function recordTimeline(input: {
  sessionId: string;
  eventType: SessionEventType | string;
  actor?: AuthenticatedIdentity | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): void {
  void repo.insertTimeline({
    session_id: input.sessionId,
    event_type: input.eventType,
    actor_id: input.actor?.user.id ?? null,
    actor_email: input.actor?.user.email ?? "",
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}

export function listTimeline(
  sessionId: string,
  options: { limit?: number; before?: string } = {},
): Promise<SessionTimelineEvent[]> {
  return repo.listTimeline(sessionId, options);
}

export function recentActivity(sessionIds: string[], limit = 20): Promise<SessionTimelineEvent[]> {
  return repo.listRecentTimeline(sessionIds, limit);
}
