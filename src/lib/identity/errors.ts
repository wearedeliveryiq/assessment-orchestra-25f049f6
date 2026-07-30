/**
 * IdentityError — the only error type crossing the identity service boundary.
 *
 * `message` is always safe to show a user; technical detail lives in `detail`
 * and is logged server-side only (OWASP: never leak authentication internals).
 */
export class IdentityError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

export const Errors = {
  invalidCredentials: () =>
    new IdentityError("invalid_credentials", "Email or password is incorrect.", 401),
  unauthenticated: () =>
    new IdentityError("unauthenticated", "Your session has expired. Please sign in again.", 401),
  forbidden: (message = "You do not have permission to perform this action.") =>
    new IdentityError("forbidden", message, 403),
  accountLocked: (until?: string) =>
    new IdentityError(
      "account_locked",
      until
        ? `This account is temporarily locked after repeated failed attempts. Try again after ${new Date(until).toLocaleTimeString()}.`
        : "This account is temporarily locked after repeated failed attempts.",
      423,
    ),
  accountNotActive: (status: string) =>
    new IdentityError(
      "account_not_active",
      status === "pending_verification"
        ? "Please verify your email address before signing in."
        : "This account is not available. Contact your administrator.",
      403,
    ),
  rateLimited: () =>
    new IdentityError("rate_limited", "Too many attempts. Please wait and try again.", 429),
  validation: (message: string) => new IdentityError("validation_failed", message, 400),
  notFound: (message = "Not found.") => new IdentityError("not_found", message, 404),
  invalidToken: (message = "This link is invalid or has expired.") =>
    new IdentityError("invalid_token", message, 400),
  internal: (detail?: unknown) =>
    new IdentityError("internal_error", "Something went wrong. Please try again.", 500, detail),
};
