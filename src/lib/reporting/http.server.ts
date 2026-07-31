import type { AuthenticatedIdentity } from "@/lib/identity/types";
import { failure, handleProtectedRoute } from "@/lib/identity/http.server";
import { ReportingError, isReportingError } from "./errors";

/**
 * HTTP boundary for /api/reporting/*: one envelope, one error policy, and a
 * single place where the caller's organisation is read and validated.
 */

export function handleReportingRoute(
  request: Request,
  handler: (context: { request: Request; identity: AuthenticatedIdentity }) => Promise<Response>,
): Promise<Response> {
  return handleProtectedRoute(request, async ({ identity }) => {
    try {
      return await handler({ request, identity });
    } catch (error) {
      if (isReportingError(error)) {
        if (error.status >= 500) console.error("[reporting] internal", error.details ?? error);
        return failure(error.code, error.message, error.status);
      }
      throw error;
    }
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: string | undefined | null, field: string): string {
  if (!value || !UUID.test(value)) {
    throw new ReportingError("invalid_request", `A valid ${field} is required.`, 400);
  }
  return value;
}

export function organisationIdFrom(request: Request, body?: Record<string, unknown>): string {
  const search = new URL(request.url).searchParams;
  const value = (body?.organisationId as string | undefined) ?? search.get("organisationId") ?? undefined;
  return requireUuid(value, "organisationId");
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
