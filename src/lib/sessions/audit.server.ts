import { recordTenantEvent, requestContext, type RequestContext } from "@/lib/tenancy/audit.server";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { recordTimeline } from "./timeline.server";
import type { AssessmentSession, SessionEventType } from "./types";

/**
 * AssessmentAuditService — one call records a lifecycle fact everywhere it must
 * appear: the session timeline (user-facing) and the platform audit trail
 * (organisation_audit_events). When the Sprint 2 Audit Service lands, only the
 * `recordTenantEvent` call below changes.
 */

export { requestContext };
export type { RequestContext };

export function auditSessionEvent(input: {
  session: AssessmentSession;
  eventType: SessionEventType | string;
  actor?: AuthenticatedIdentity | null;
  summary: string;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
}): void {
  recordTimeline({
    sessionId: input.session.id,
    eventType: input.eventType,
    actor: input.actor,
    summary: input.summary,
    metadata: input.metadata,
  });

  recordTenantEvent({
    eventType: input.eventType as never,
    actor: input.actor,
    organisationId: input.session.organisationId,
    workspaceId: input.session.workspaceId,
    entityType: "assessment_session",
    entityId: input.session.id,
    summary: input.summary,
    metadata: { knowledgePackId: input.session.knowledgePackId, ...(input.metadata ?? {}) },
    context: input.context,
  });
}
