import * as repo from "./repository.server";
import type { PlatformNotification, TenantNotificationType } from "./types";

/**
 * NotificationService — a small, module-agnostic notification fan-out.
 *
 * Tenancy is the first consumer; other platform modules publish through the
 * same `notify` entry point by passing their own `module` identifier.
 */

const COPY: Record<TenantNotificationType, string> = {
  "invitation.accepted": "Invitation accepted",
  "member.added": "New member added",
  "member.removed": "Member removed",
  "workspace.created": "Workspace created",
  "workspace.archived": "Workspace archived",
  "role.changed": "Role changed",
};

export function notify(input: {
  recipients: string[];
  eventType: TenantNotificationType | string;
  title?: string;
  body?: string;
  module?: string;
  organisationId?: string | null;
  workspaceId?: string | null;
  severity?: "info" | "warning" | "error";
  metadata?: Record<string, unknown>;
}): void {
  const recipients = [...new Set(input.recipients.filter(Boolean))];
  if (recipients.length === 0) return;

  void repo.insertNotifications(
    recipients.map((userId) => ({
      user_id: userId,
      organisation_id: input.organisationId ?? null,
      workspace_id: input.workspaceId ?? null,
      module: input.module ?? "organisation",
      event_type: input.eventType,
      title: input.title ?? COPY[input.eventType as TenantNotificationType] ?? "Update",
      body: input.body ?? "",
      severity: input.severity ?? "info",
      metadata: input.metadata ?? {},
    })),
  );
}

export function listNotifications(userId: string, limit?: number): Promise<PlatformNotification[]> {
  return repo.listNotifications(userId, limit);
}

export function markRead(userId: string, ids: string[]): Promise<void> {
  return repo.markNotificationsRead(userId, ids);
}
