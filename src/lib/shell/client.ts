import type { ShellNotification, UserPreferences } from "./types";

/**
 * Browser-side client for the shell REST surface.
 *
 * Keeps `fetch` details (envelope unwrapping, credentials, error shape) out of
 * hooks and components.
 */

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  }
  return (payload?.data ?? payload) as T;
}

export function fetchPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>("/api/user/preferences");
}

export function savePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  return request<UserPreferences>("/api/user/preferences", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function fetchNotifications(): Promise<{ notifications: ShellNotification[]; unread: number }> {
  return request("/api/notifications");
}

export function markNotificationsRead(options: { ids?: string[]; all?: boolean }): Promise<{ updated: number }> {
  return request("/api/notifications/read", { method: "PUT", body: JSON.stringify(options) });
}

export function dismissNotifications(options: { ids?: string[]; all?: boolean }): Promise<{ dismissed: number }> {
  return request("/api/notifications", { method: "DELETE", body: JSON.stringify(options) });
}

export function fetchNavigation(): Promise<{ sections: unknown[] }> {
  return request("/api/navigation");
}
