import { insertAuditEvent, listAuditEvents } from "./repository.server";
import type { IdentityAuditEvent, IdentityAuditEventType } from "./types";

/**
 * IdentityAuditService — immutable security audit trail for identity events.
 * Writes are fire-and-forget: auditing must never break an auth flow.
 */

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
}

export const EMPTY_CONTEXT: RequestContext = {
  ipAddress: "unknown",
  userAgent: "unknown",
  device: "Unknown device",
  browser: "Unknown browser",
};

export function requestContext(request: Request): RequestContext {
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return { ipAddress, userAgent, device: describeDevice(userAgent), browser: describeBrowser(userAgent) };
}

function describeDevice(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "Mobile";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown device";
}

function describeBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  return "Unknown browser";
}

const FAILURE_TYPES = new Set<IdentityAuditEventType>([
  "auth.login_failed",
  "auth.locked",
]);

export function recordIdentityEvent(input: {
  eventType: IdentityAuditEventType;
  userId?: string | null;
  email?: string;
  organisationId?: string | null;
  outcome?: "success" | "failure";
  severity?: "info" | "warning" | "error";
  context?: RequestContext;
  metadata?: Record<string, unknown>;
}): void {
  const context = input.context ?? EMPTY_CONTEXT;
  const outcome = input.outcome ?? (FAILURE_TYPES.has(input.eventType) ? "failure" : "success");

  void insertAuditEvent({
    user_id: input.userId ?? null,
    email: (input.email ?? "").toLowerCase(),
    organisation_id: input.organisationId ?? null,
    event_type: input.eventType,
    outcome,
    severity: input.severity ?? (outcome === "failure" ? "warning" : "info"),
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    metadata: input.metadata ?? {},
  });
}

export function readIdentityEvents(userId: string, limit?: number): Promise<IdentityAuditEvent[]> {
  return listAuditEvents(userId, limit);
}
