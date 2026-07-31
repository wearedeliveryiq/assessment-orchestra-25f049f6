import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { toShellNotification, unreadCount } from "./notifications";
import type { ShellNotification } from "./types";

/**
 * Notification centre persistence: list, mark read (single/all) and dismiss.
 * Every query is scoped to the caller's user id — there is no cross-user read.
 */

const db = () => supabaseAdmin as unknown as any;

export interface NotificationFeed {
  notifications: ShellNotification[];
  unread: number;
}

export async function listFeed(userId: string, limit = 50): Promise<NotificationFeed> {
  const { data, error } = await db()
    .from("platform_notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[shell-notifications] list failed", error);
    return { notifications: [], unread: 0 };
  }

  const notifications = (data ?? []).map((row: Record<string, any>) =>
    toShellNotification({
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity,
      module: row.module,
      eventType: row.event_type,
      createdAt: row.created_at,
      readAt: row.read_at,
      metadata: row.metadata,
    }),
  );

  return { notifications, unread: unreadCount(notifications) };
}

/** Marks the given ids read, or every unread notification when `all` is set. */
export async function markRead(
  userId: string,
  options: { ids?: string[]; all?: boolean },
): Promise<number> {
  let query = db()
    .from("platform_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (!options.all) {
    const ids = (options.ids ?? []).filter(Boolean);
    if (ids.length === 0) return 0;
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("[shell-notifications] mark read failed", error);
    throw new Error("notification_update_failed");
  }
  return (data ?? []).length;
}

/** Soft dismissal keeps the audit trail intact while hiding the item. */
export async function dismiss(userId: string, options: { ids?: string[]; all?: boolean }): Promise<number> {
  let query = db()
    .from("platform_notifications")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (!options.all) {
    const ids = (options.ids ?? []).filter(Boolean);
    if (ids.length === 0) return 0;
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("[shell-notifications] dismiss failed", error);
    throw new Error("notification_delete_failed");
  }
  return (data ?? []).length;
}
