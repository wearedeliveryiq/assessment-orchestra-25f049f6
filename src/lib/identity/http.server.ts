import { IdentityError } from "./errors";
import { requestContext } from "./audit.server";
import { identityFromRequest } from "./authentication.server";
import type { AuthenticatedIdentity } from "./types";

/**
 * HTTP boundary helpers shared by every /api/auth route: one envelope, one
 * error-translation policy, one place where bearer tokens are validated.
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), { status, headers: JSON_HEADERS });
}

export function failure(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Wraps a handler so no internal error detail ever reaches the client. */
export async function handleAuthRoute(
  request: Request,
  handler: (context: {
    request: Request;
    ctx: ReturnType<typeof requestContext>;
  }) => Promise<Response>,
): Promise<Response> {
  try {
    return await handler({ request, ctx: requestContext(request) });
  } catch (error) {
    if (error instanceof IdentityError) {
      if (error.status >= 500) console.error("[identity] internal", error.detail ?? error);
      return failure(error.code, error.message, error.status);
    }
    console.error("[identity] unhandled", error);
    return failure("internal_error", "Something went wrong. Please try again.", 500);
  }
}

/** Same as `handleAuthRoute` but resolves the caller first (401 when absent). */
export function handleProtectedRoute(
  request: Request,
  handler: (context: {
    request: Request;
    ctx: ReturnType<typeof requestContext>;
    identity: AuthenticatedIdentity;
  }) => Promise<Response>,
): Promise<Response> {
  return handleAuthRoute(request, async ({ ctx }) => {
    const identity = await identityFromRequest(request);
    return handler({ request, ctx, identity });
  });
}

export function originOf(request: Request): string {
  return new URL(request.url).origin;
}

/** Prevents verification and reset emails from being used as open redirects. */
export function firstPartyRedirect(
  request: Request,
  requested: unknown,
  fallbackPath: string,
): string {
  const origin = originOf(request);
  if (typeof requested !== "string") return `${origin}${fallbackPath}`;
  try {
    const target = new URL(requested);
    return target.origin === origin ? target.toString() : `${origin}${fallbackPath}`;
  } catch {
    return `${origin}${fallbackPath}`;
  }
}
