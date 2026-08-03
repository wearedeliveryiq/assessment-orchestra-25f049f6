import { supabase } from "@/integrations/supabase/client";

import type {
  ApiResponse,
  AuthenticatedIdentity,
  IdentityAuditEvent,
  IdentitySession,
  LoginResult,
  OrganisationInvitation,
  UserProfile,
} from "./types";

/**
 * Browser-side identity client. All identity logic lives on the server; this
 * module only speaks HTTP and hands the returned tokens to the auth client so
 * the rest of the app keeps working with a normal signed-in session.
 */

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`/api/auth/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!payload) throw new Error("The server returned an unexpected response.");
  if (!payload.success) throw new Error(payload.error.message);
  return payload.data;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return call<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
}

/* ------------------------------ authentication ---------------------------- */

export async function registerAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  redirectTo?: string;
}): Promise<{ email: string; verificationRequired: boolean }> {
  return post("register", {
    ...input,
    redirectTo: input.redirectTo ?? `${window.location.origin}/auth/verify-email`,
  });
}

export async function signIn(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<LoginResult> {
  const result = await post<LoginResult>("login", input);
  await supabase.auth.setSession({
    access_token: result.tokens.accessToken,
    refresh_token: result.tokens.refreshToken,
  });
  return result;
}

export async function signOut(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  await post("logout", { refreshToken: data.session?.refresh_token }).catch(() => undefined);
  await supabase.auth.signOut();
}

export function currentIdentity(): Promise<AuthenticatedIdentity> {
  return call<AuthenticatedIdentity>("session");
}

/* --------------------------------- password ------------------------------- */

export function requestPasswordReset(email: string): Promise<{ sent: boolean }> {
  return post("password/forgot", {
    email,
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
}

export function changePassword(input: {
  currentPassword?: string;
  newPassword: string;
  reset?: boolean;
}): Promise<UserProfile> {
  return post("password/change", input);
}

/* ------------------------------ email verify ------------------------------ */

export function confirmVerification(): Promise<UserProfile> {
  return post("verify-email", {});
}

export function resendVerification(
  email: string,
  redirectTo = `${window.location.origin}/auth/verify-email`,
): Promise<{ sent: boolean }> {
  return post("verify-email/resend", {
    email,
    redirectTo,
  });
}

/* --------------------------------- profile -------------------------------- */

export function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  return call<UserProfile>("profile", { method: "PATCH", body: JSON.stringify(patch) });
}

/* -------------------------------- sessions -------------------------------- */

export function listSessions(): Promise<IdentitySession[]> {
  return call<IdentitySession[]>("sessions");
}

export function revokeSession(id: string): Promise<{ revoked: boolean }> {
  return call(`sessions/${id}`, { method: "DELETE" });
}

export function revokeAllSessions(): Promise<{ revoked: boolean }> {
  return call("sessions", { method: "DELETE" });
}

/* ------------------------------- invitations ------------------------------ */

export function inviteMember(input: {
  organisationId: string;
  email: string;
  role: string;
}): Promise<{ invitation: OrganisationInvitation; inviteUrl: string }> {
  return post("invitations", input);
}

export function acceptInvitation(token: string): Promise<{ accepted: boolean }> {
  return post("invitations/accept", { token });
}

/* ---------------------------------- audit --------------------------------- */

export function securityActivity(): Promise<IdentityAuditEvent[]> {
  return call<IdentityAuditEvent[]>("activity");
}
