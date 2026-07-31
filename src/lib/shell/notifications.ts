import type { NotificationGroup, NotificationKind, ShellNotification } from "./types";

/**
 * NotificationCentreService — pure shaping logic for the notification panel.
 *
 * Delivery and persistence belong to the platform notification service; this
 * module only decides how notifications are classified, counted and grouped so
 * the UI stays free of business rules.
 */

const MODULE_LABELS: Record<string, string> = {
  organisation: "Organisation",
  assessment: "Assessments",
  runtime: "Runtime",
  reports: "Reports",
  system: "System",
};

const ACTION_EVENTS = ["invitation.received", "assessment.assigned", "review.requested", "approval.required"];

/** Maps a stored severity/event pair onto one of the five shell kinds. */
export function classify(severity: string, eventType: string): NotificationKind {
  if (ACTION_EVENTS.includes(eventType)) return "action";
  switch (severity) {
    case "error":
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "success":
      return "success";
    default:
      return eventType.endsWith(".completed") || eventType.endsWith(".accepted") ? "success" : "info";
  }
}

/** Deep link for a notification, derived from its module and metadata. */
export function deepLink(notification: {
  module: string;
  eventType: string;
  metadata?: Record<string, unknown> | null;
}): string | undefined {
  const metadata = notification.metadata ?? {};
  const sessionId = typeof metadata.sessionId === "string" ? metadata.sessionId : undefined;
  const workspaceId = typeof metadata.workspaceId === "string" ? metadata.workspaceId : undefined;
  const organisationId = typeof metadata.organisationId === "string" ? metadata.organisationId : undefined;

  if (sessionId) return `/sessions/${sessionId}`;
  if (workspaceId) return `/workspaces/${workspaceId}`;
  if (organisationId) return `/organisations/${organisationId}`;
  if (typeof metadata.href === "string") return metadata.href;
  return undefined;
}

export function toShellNotification(row: {
  id: string;
  title: string;
  body?: string | null;
  severity?: string | null;
  module?: string | null;
  eventType?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
}): ShellNotification {
  const module = row.module ?? "system";
  const eventType = row.eventType ?? "update";
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    kind: classify(row.severity ?? "info", eventType),
    module,
    eventType,
    createdAt: row.createdAt ?? new Date().toISOString(),
    readAt: row.readAt ?? null,
    href: deepLink({ module, eventType, metadata: row.metadata }),
  };
}

export function unreadCount(notifications: ShellNotification[]): number {
  return notifications.filter((notification) => notification.readAt === null).length;
}

export function filterByKind(
  notifications: ShellNotification[],
  kind: NotificationKind | "all",
): ShellNotification[] {
  return kind === "all" ? notifications : notifications.filter((item) => item.kind === kind);
}

export function groupByModule(notifications: ShellNotification[]): NotificationGroup[] {
  const groups = new Map<string, ShellNotification[]>();
  for (const notification of notifications) {
    const bucket = groups.get(notification.module) ?? [];
    bucket.push(notification);
    groups.set(notification.module, bucket);
  }

  return [...groups.entries()]
    .map(([module, items]) => ({
      module,
      label: MODULE_LABELS[module] ?? module.replace(/\b\w/g, (c) => c.toUpperCase()),
      unread: unreadCount(items),
      items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .sort((a, b) => b.unread - a.unread || a.label.localeCompare(b.label));
}

/** Local state transition for "mark as read" — mirrors the API result. */
export function markReadLocally(
  notifications: ShellNotification[],
  ids: string[],
): ShellNotification[] {
  const target = new Set(ids);
  const now = new Date().toISOString();
  return notifications.map((notification) =>
    target.has(notification.id) && notification.readAt === null
      ? { ...notification, readAt: now }
      : notification,
  );
}

export function dismissLocally(notifications: ShellNotification[], ids: string[]): ShellNotification[] {
  const target = new Set(ids);
  return notifications.filter((notification) => !target.has(notification.id));
}
