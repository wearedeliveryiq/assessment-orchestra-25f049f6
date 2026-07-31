import { requestContext, type RequestContext } from "@/lib/identity/audit.server";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

import * as repo from "./repository.server";
import type { TenantAuditEvent, TenantAuditEventType } from "./types";

/**
 * OrganisationAuditService — tenancy-scoped audit trail.
 *
 * Records are persisted locally in `organisation_audit_events`; the writer is
 * fire-and-forget so auditing can never break a tenancy operation. When the
 * platform Audit Service takes ownership, only `record` needs to change.
 */

export { requestContext };
export type { RequestContext };

export function recordTenantEvent(input: {
  eventType: TenantAuditEventType;
  actor?: AuthenticatedIdentity | null;
  organisationId?: string | null;
  workspaceId?: string | null;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
}): void {
  void repo.insertAudit({
    organisation_id: input.organisationId ?? null,
    workspace_id: input.workspaceId ?? null,
    actor_id: input.actor?.user.id ?? null,
    actor_email: input.actor?.user.email ?? "",
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
    ip_address: input.context?.ipAddress ?? "unknown",
  });
}

export function readTenantAudit(filter: {
  organisationId?: string;
  workspaceId?: string;
  limit?: number;
}): Promise<TenantAuditEvent[]> {
  return repo.listAudit(filter);
}
