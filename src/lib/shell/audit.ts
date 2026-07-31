/**
 * Shell audit trail.
 *
 * Navigation, workspace switches, theme and preference changes are recorded as
 * lightweight events. They are buffered and flushed in the background so shell
 * interactions never block on the audit service.
 */

export type ShellAuditEvent =
  | "navigation.visited"
  | "workspace.switched"
  | "preference.changed"
  | "theme.changed"
  | "notification.read"
  | "notification.dismissed"
  | "search.performed";

export interface ShellAuditRecord {
  event: ShellAuditEvent;
  at: string;
  detail?: Record<string, unknown>;
}

const buffer: ShellAuditRecord[] = [];
const MAX_BUFFER = 50;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function recordShellEvent(event: ShellAuditEvent, detail?: Record<string, unknown>): void {
  buffer.push({ event, at: new Date().toISOString(), detail });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  scheduleFlush();
}

export function pendingShellEvents(): ShellAuditRecord[] {
  return [...buffer];
}

export function drainShellEvents(): ShellAuditRecord[] {
  return buffer.splice(0, buffer.length);
}

function scheduleFlush(): void {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushShellEvents();
  }, 4000);
}

/** Best-effort delivery: audit gaps must never surface as user-facing errors. */
export async function flushShellEvents(): Promise<void> {
  const events = drainShellEvents();
  if (events.length === 0) return;

  try {
    await fetch("/api/shell/audit", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    /* offline or unauthenticated — drop silently */
  }
}
