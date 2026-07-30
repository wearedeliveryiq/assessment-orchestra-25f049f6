import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { EMPTY_CONTEXT, recordIdentityEvent, type RequestContext } from "./audit.server";
import { Errors, IdentityError } from "./errors";
import {
  DEFAULT_PASSWORD_POLICY,
  canAuthenticate,
  evaluatePassword,
} from "./password-policy";
import { permissionsFor } from "./rbac";
import * as repo from "./repository.server";
import type {
  AuthTokens,
  AuthenticatedIdentity,
  LoginResult,
  PlatformRole,
  UserProfile,
} from "./types";

/**
 * AuthenticationService.
 *
 * Credentials are never stored or hashed by this application — they live in the
 * managed identity provider. This service owns everything around them:
 * policy enforcement, lockout, session records, status gating and auditing.
 */

const LOCKOUT_WINDOW_MS = 15 * 60_000;
const LOCKOUT_THRESHOLD = 5;
const SESSION_TTL_MS = 12 * 60 * 60_000;
const REMEMBERED_TTL_MS = 30 * 24 * 60 * 60_000;
const DEFAULT_ROLE: PlatformRole = "contributor";

export function authClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Errors.internal("Missing Supabase configuration");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normaliseEmail(email: unknown): string {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value) || value.length > 254) {
    throw Errors.validation("Enter a valid email address.");
  }
  return value;
}

export function assertPasswordPolicy(password: unknown): string {
  if (typeof password !== "string") throw Errors.validation("Enter a password.");
  const evaluation = evaluatePassword(password);
  if (!evaluation.valid) throw Errors.validation(evaluation.failures[0]);
  return password;
}

function requiredName(value: unknown, field: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > 80) throw Errors.validation(`Enter a valid ${field}.`);
  return text;
}

/* ------------------------------- identity -------------------------------- */

export async function resolveIdentity(userId: string): Promise<AuthenticatedIdentity> {
  const [profile, roles, memberships] = await Promise.all([
    repo.findProfile(userId),
    repo.listRoles(userId),
    repo.listMemberships(userId),
  ]);
  if (!profile) throw Errors.notFound("Profile not found.");
  const effective = roles.length > 0 ? roles : [DEFAULT_ROLE];
  return { user: profile, roles: effective, memberships, permissions: permissionsFor(effective) };
}

/** Validates the caller's bearer token and returns their full identity. */
export async function identityFromRequest(request: Request): Promise<AuthenticatedIdentity> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw Errors.unauthenticated();
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) throw Errors.unauthenticated();

  const { data, error } = await authClient().auth.getClaims(token);
  if (error || !data?.claims?.sub) throw Errors.unauthenticated();
  return resolveIdentity(data.claims.sub as string);
}

/* ------------------------------ registration ----------------------------- */

export interface RegisterInput {
  email: unknown;
  password: unknown;
  firstName: unknown;
  lastName: unknown;
  redirectTo?: string;
}

export async function register(
  input: RegisterInput,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<{ email: string; verificationRequired: boolean }> {
  const email = normaliseEmail(input.email);
  const password = assertPasswordPolicy(input.password);
  const firstName = requiredName(input.firstName, "first name");
  const lastName = requiredName(input.lastName, "last name");

  const { data, error } = await authClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: input.redirectTo,
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    // Never disclose whether an address is already registered.
    if (/already/i.test(error.message)) {
      recordIdentityEvent({
        eventType: "account.created",
        email,
        outcome: "failure",
        context,
        metadata: { reason: "duplicate" },
      });
      return { email, verificationRequired: true };
    }
    throw new IdentityError("registration_failed", error.message, 400);
  }

  const userId = data.user?.id;
  if (userId) {
    await repo.grantRole(userId, DEFAULT_ROLE).catch(() => undefined);
    await repo
      .recordPasswordFingerprint(userId, await sha256(`${userId}:${password}`))
      .catch(() => undefined);
    recordIdentityEvent({ eventType: "account.created", userId, email, context });
  }

  return { email, verificationRequired: !data.session };
}

/* --------------------------------- login --------------------------------- */

export interface LoginInput {
  email: unknown;
  password: unknown;
  rememberMe?: boolean;
}

export async function login(
  input: LoginInput,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<LoginResult> {
  const email = normaliseEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const rememberMe = Boolean(input.rememberMe);

  const failures = await repo.countRecentFailures(email, LOCKOUT_WINDOW_MS);
  if (failures >= LOCKOUT_THRESHOLD) {
    recordIdentityEvent({ eventType: "auth.locked", email, context, metadata: { failures } });
    throw Errors.accountLocked(new Date(Date.now() + LOCKOUT_WINDOW_MS).toISOString());
  }

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    await repo.recordLoginAttempt({
      email,
      ipAddress: context.ipAddress,
      successful: false,
      reason: error?.message ?? "unknown",
    });
    recordIdentityEvent({
      eventType: "auth.login_failed",
      email,
      context,
      metadata: { attempt: failures + 1 },
    });
    if (error && /confirm/i.test(error.message)) throw Errors.accountNotActive("pending_verification");
    throw Errors.invalidCredentials();
  }

  const userId = data.user.id;
  let profile = await repo.findProfile(userId);
  if (profile && profile.status === "pending_verification" && data.user.email_confirmed_at) {
    profile = await repo.updateProfile(userId, { status: "active", email_verified: true });
  }
  if (profile && !canAuthenticate(profile.status)) {
    recordIdentityEvent({
      eventType: "auth.login_failed",
      userId,
      email,
      context,
      metadata: { reason: profile.status },
    });
    throw Errors.accountNotActive(profile.status);
  }

  const now = new Date();
  const ttl = rememberMe ? REMEMBERED_TTL_MS : SESSION_TTL_MS;
  const sessionKey = await sha256(data.session.refresh_token);

  const [session] = await Promise.all([
    repo.createSession({
      userId,
      sessionKey,
      device: context.device,
      browser: context.browser,
      ipAddress: context.ipAddress,
      rememberMe,
      expiresAt: new Date(now.getTime() + ttl).toISOString(),
    }),
    repo.updateProfile(userId, { last_login_at: now.toISOString() }),
    repo.recordLoginAttempt({ email, ipAddress: context.ipAddress, successful: true }),
  ]);

  recordIdentityEvent({ eventType: "auth.login", userId, email, context, metadata: { rememberMe } });

  return {
    identity: await resolveIdentity(userId),
    tokens: toTokens(data.session),
    session,
  };
}

function toTokens(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}): AuthTokens {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  };
}

/* --------------------------------- logout -------------------------------- */

export async function logout(
  identity: AuthenticatedIdentity,
  refreshToken: string | undefined,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<void> {
  if (refreshToken) {
    await repo.revokeSessionByKey(identity.user.id, await sha256(refreshToken)).catch(() => undefined);
  }
  recordIdentityEvent({
    eventType: "auth.logout",
    userId: identity.user.id,
    email: identity.user.email,
    context,
  });
}

/* ------------------------------- passwords ------------------------------- */

export async function requestPasswordReset(
  emailInput: unknown,
  redirectTo: string,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<void> {
  const email = normaliseEmail(emailInput);
  // Always succeeds from the caller's perspective (no account enumeration).
  await authClient().auth.resetPasswordForEmail(email, { redirectTo });
  recordIdentityEvent({ eventType: "password.reset_requested", email, context });
}

/**
 * Applies a new password for the holder of a valid access token (used by both
 * the reset-link flow and the signed-in change-password form).
 */
export async function updatePassword(
  accessToken: string,
  newPassword: unknown,
  context: RequestContext = EMPTY_CONTEXT,
  options: { reset?: boolean } = {},
): Promise<UserProfile> {
  const password = assertPasswordPolicy(newPassword);
  const { data: claims, error: claimsError } = await authClient().auth.getClaims(accessToken);
  if (claimsError || !claims?.claims?.sub) throw Errors.unauthenticated();
  const userId = claims.claims.sub as string;

  const fingerprint = await sha256(`${userId}:${password}`);
  const history = await repo.recentPasswordFingerprints(userId, DEFAULT_PASSWORD_POLICY.historyDepth);
  if (history.includes(fingerprint)) {
    throw Errors.validation(
      `Choose a password you have not used in your last ${DEFAULT_PASSWORD_POLICY.historyDepth} passwords.`,
    );
  }

  const scoped = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { error } = await scoped.auth.updateUser({ password });
  if (error) throw new IdentityError("password_update_failed", error.message, 400);

  await repo.recordPasswordFingerprint(userId, fingerprint);
  const profile = await repo.updateProfile(userId, {
    password_changed_at: new Date().toISOString(),
    status: "active",
    email_verified: true,
  });

  recordIdentityEvent({
    eventType: options.reset ? "password.reset_completed" : "password.changed",
    userId,
    email: profile.email,
    context,
  });

  return profile;
}

/** Marks an account verified once the provider confirms the email address. */
export async function confirmEmailVerified(
  accessToken: string,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<UserProfile> {
  const { data, error } = await authClient().auth.getClaims(accessToken);
  if (error || !data?.claims?.sub) throw Errors.unauthenticated();
  const userId = data.claims.sub as string;
  const profile = await repo.updateProfile(userId, { email_verified: true, status: "active" });
  recordIdentityEvent({ eventType: "email.verified", userId, email: profile.email, context });
  return profile;
}

export async function resendVerification(
  emailInput: unknown,
  redirectTo: string,
  context: RequestContext = EMPTY_CONTEXT,
): Promise<void> {
  const email = normaliseEmail(emailInput);
  await authClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
  recordIdentityEvent({ eventType: "email.verification_resent", email, context });
}
