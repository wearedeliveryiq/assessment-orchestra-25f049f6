/**
 * Parsing for Supabase email-callback URLs (verification and recovery).
 *
 * Supabase delivers auth callbacks in three shapes:
 *
 *  1. implicit session tokens in the URL fragment
 *     (`#access_token=…&refresh_token=…&type=signup`);
 *  2. a one-time token hash in the query string
 *     (`?token_hash=…&type=signup`);
 *  3. an error in either location
 *     (`#error=access_denied&error_code=otp_expired&error_description=…`).
 *
 * Every value here is treated as untrusted input: nothing from the URL is ever
 * echoed back to the user, so expired or tampered links can never leak a token
 * or a raw provider message into the interface.
 */

export type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export interface AuthCallback {
  /** Safe, customer-facing error message when the link itself is unusable. */
  error: string | null;
  /** One-time token hash that must be exchanged for a session. */
  tokenHash: string | null;
  /** Verification type declared by the link, normalised to a supported value. */
  otpType: EmailOtpType;
  /** True when the link already carries implicit session tokens. */
  hasSessionTokens: boolean;
}

const SAFE_ERRORS: Record<string, string> = {
  otp_expired: "This link has expired. Request a new one to continue.",
  access_denied: "This link is no longer valid. Request a new one to continue.",
  invalid_request: "This link is invalid. Request a new one to continue.",
};

export const GENERIC_LINK_ERROR =
  "This link is invalid, expired, or has already been used. Request a new one to continue.";

function readParams(hash: string, search: string): URLSearchParams {
  const fragment = hash.replace(/^#/, "");
  const merged = new URLSearchParams(fragment);
  new URLSearchParams(search.replace(/^\?/, "")).forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged;
}

export function resolveOtpType(value: string | null, fallback: EmailOtpType): EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : fallback;
}

export function parseAuthCallback(
  hash: string,
  search: string,
  fallbackType: EmailOtpType = "signup",
): AuthCallback {
  const params = readParams(hash, search);
  const errorCode = params.get("error_code") ?? params.get("error");

  return {
    error: errorCode ? (SAFE_ERRORS[errorCode] ?? GENERIC_LINK_ERROR) : null,
    tokenHash: params.get("token_hash"),
    otpType: resolveOtpType(params.get("type"), fallbackType),
    hasSessionTokens: params.has("access_token") || params.has("code"),
  };
}

/**
 * Only same-origin, path-only destinations may be used after a callback, so a
 * crafted link can never bounce a freshly authenticated user off-site.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
