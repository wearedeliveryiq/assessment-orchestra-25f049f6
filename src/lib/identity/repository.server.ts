import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { Errors } from "./errors";
import type {
  IdentityAuditEvent,
  IdentitySession,
  MembershipStatus,
  Organisation,
  OrganisationInvitation,
  OrganisationMembership,
  PlatformRole,
  UserProfile,
  UserStatus,
} from "./types";

/**
 * IdentityRepository — the single persistence boundary for the identity
 * platform. Every service goes through here; no service talks to the database
 * directly, which keeps the storage engine replaceable.
 */

/* --------------------------------- mappers -------------------------------- */

type Row = Record<string, any>;

export function toProfile(row: Row): UserProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    displayName: row.display_name || row.email,
    status: row.status as UserStatus,
    emailVerified: Boolean(row.email_verified),
    lastLogin: row.last_login_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profileImage: row.profile_image ?? null,
    preferredLanguage: row.preferred_language ?? "en-GB",
    timezone: row.timezone ?? "Europe/London",
    mfaEnabled: Boolean(row.mfa_enabled),
    passwordChangedAt: row.password_changed_at,
  };
}

function toSession(row: Row): IdentitySession {
  return {
    id: row.id,
    userId: row.user_id,
    device: row.device,
    browser: row.browser,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
    expiresAt: row.expires_at,
    revoked: Boolean(row.revoked),
    rememberMe: Boolean(row.remember_me),
  };
}

function toMembership(row: Row): OrganisationMembership {
  return {
    id: row.id,
    userId: row.user_id,
    organisationId: row.organisation_id,
    organisationName: row.organisations?.name,
    role: row.role as PlatformRole,
    status: row.status as MembershipStatus,
    joinedAt: row.joined_at,
  };
}

function toInvitation(row: Row): OrganisationInvitation {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    email: row.email,
    role: row.role as PlatformRole,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function fail(context: string, error: unknown): never {
  console.error(`[identity-repository] ${context}`, error);
  throw Errors.internal(error);
}

/* --------------------------------- profiles ------------------------------- */

export async function findProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("identity_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail("findProfile", error);
  return data ? toProfile(data) : null;
}

export async function findProfileByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("identity_profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) fail("findProfileByEmail", error);
  return data ? toProfile(data) : null;
}

export async function updateProfile(
  userId: string,
  patch: Record<string, unknown>,
): Promise<UserProfile> {
  const { data, error } = await supabaseAdmin
    .from("identity_profiles")
    .update(patch as never)
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error) fail("updateProfile", error);
  if (!data) throw Errors.notFound("Profile not found.");
  return toProfile(data);
}

/* ---------------------------------- roles --------------------------------- */

export async function listRoles(userId: string): Promise<PlatformRole[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) fail("listRoles", error);
  return (data ?? []).map((row) => row.role as PlatformRole);
}

export async function grantRole(
  userId: string,
  role: PlatformRole,
  grantedBy?: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role, granted_by: grantedBy ?? null } as never, {
      onConflict: "user_id,role",
    });
  if (error) fail("grantRole", error);
}

export async function revokeRole(userId: string, role: PlatformRole): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) fail("revokeRole", error);
}

/* -------------------------------- sessions -------------------------------- */

export async function createSession(input: {
  userId: string;
  sessionKey: string;
  device: string;
  browser: string;
  ipAddress: string;
  rememberMe: boolean;
  expiresAt: string;
}): Promise<IdentitySession> {
  const { data, error } = await supabaseAdmin
    .from("identity_sessions")
    .upsert(
      {
        user_id: input.userId,
        session_key: input.sessionKey,
        device: input.device,
        browser: input.browser,
        ip_address: input.ipAddress,
        remember_me: input.rememberMe,
        expires_at: input.expiresAt,
        last_activity: new Date().toISOString(),
        revoked: false,
        revoked_at: null,
      } as never,
      { onConflict: "user_id,session_key" },
    )
    .select("*")
    .maybeSingle();
  if (error) fail("createSession", error);
  return toSession(data as Row);
}

export async function listSessions(userId: string): Promise<IdentitySession[]> {
  const { data, error } = await supabaseAdmin
    .from("identity_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_activity", { ascending: false })
    .limit(100);
  if (error) fail("listSessions", error);
  return (data ?? []).map(toSession);
}

export async function touchSession(userId: string, sessionKey: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("identity_sessions")
    .update({ last_activity: new Date().toISOString() } as never)
    .eq("user_id", userId)
    .eq("session_key", sessionKey);
  if (error) fail("touchSession", error);
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("identity_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() } as never)
    .eq("user_id", userId)
    .eq("id", sessionId);
  if (error) fail("revokeSession", error);
}

export async function revokeSessionByKey(userId: string, sessionKey: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("identity_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() } as never)
    .eq("user_id", userId)
    .eq("session_key", sessionKey);
  if (error) fail("revokeSessionByKey", error);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("identity_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() } as never)
    .eq("user_id", userId)
    .eq("revoked", false);
  if (error) fail("revokeAllSessions", error);
}

/* ------------------------------ organisations ----------------------------- */

export async function findOrganisation(id: string): Promise<Organisation | null> {
  const { data, error } = await supabaseAdmin
    .from("organisations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("findOrganisation", error);
  return data ? { id: data.id, name: data.name, slug: data.slug, createdAt: data.created_at } : null;
}

export async function listMemberships(userId: string): Promise<OrganisationMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("organisation_memberships")
    .select("*, organisations(name)")
    .eq("user_id", userId)
    .neq("status", "removed");
  if (error) fail("listMemberships", error);
  return (data ?? []).map(toMembership);
}

export async function findMembership(
  userId: string,
  organisationId: string,
): Promise<OrganisationMembership | null> {
  const { data, error } = await supabaseAdmin
    .from("organisation_memberships")
    .select("*, organisations(name)")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) fail("findMembership", error);
  return data ? toMembership(data) : null;
}

export async function upsertMembership(input: {
  userId: string;
  organisationId: string;
  role: PlatformRole;
  status: MembershipStatus;
  invitedBy?: string | null;
}): Promise<OrganisationMembership> {
  const { data, error } = await supabaseAdmin
    .from("organisation_memberships")
    .upsert(
      {
        user_id: input.userId,
        organisation_id: input.organisationId,
        role: input.role,
        status: input.status,
        invited_by: input.invitedBy ?? null,
      } as never,
      { onConflict: "user_id,organisation_id" },
    )
    .select("*, organisations(name)")
    .maybeSingle();
  if (error) fail("upsertMembership", error);
  return toMembership(data as Row);
}

export async function removeMembership(userId: string, organisationId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("organisation_memberships")
    .update({ status: "removed" } as never)
    .eq("user_id", userId)
    .eq("organisation_id", organisationId);
  if (error) fail("removeMembership", error);
}

/* ------------------------------- invitations ------------------------------ */

export async function createInvitation(input: {
  organisationId: string;
  email: string;
  role: PlatformRole;
  tokenHash: string;
  expiresAt: string;
  invitedBy: string;
}): Promise<OrganisationInvitation> {
  const { data, error } = await supabaseAdmin
    .from("organisation_invitations")
    .insert({
      organisation_id: input.organisationId,
      email: input.email.toLowerCase(),
      role: input.role,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      invited_by: input.invitedBy,
    } as never)
    .select("*")
    .maybeSingle();
  if (error) fail("createInvitation", error);
  return toInvitation(data as Row);
}

export async function findInvitationByToken(tokenHash: string): Promise<Row | null> {
  const { data, error } = await supabaseAdmin
    .from("organisation_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) fail("findInvitationByToken", error);
  return data ?? null;
}

export async function markInvitation(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("organisation_invitations")
    .update(patch as never)
    .eq("id", id);
  if (error) fail("markInvitation", error);
}

export async function listInvitations(organisationId: string): Promise<OrganisationInvitation[]> {
  const { data, error } = await supabaseAdmin
    .from("organisation_invitations")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });
  if (error) fail("listInvitations", error);
  return (data ?? []).map(toInvitation);
}

/* ---------------------------- password history ---------------------------- */

export async function recordPasswordFingerprint(
  userId: string,
  fingerprint: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("password_history")
    .insert({ user_id: userId, password_fingerprint: fingerprint } as never);
  if (error) fail("recordPasswordFingerprint", error);
}

export async function recentPasswordFingerprints(
  userId: string,
  depth: number,
): Promise<string[]> {
  if (depth <= 0) return [];
  const { data, error } = await supabaseAdmin
    .from("password_history")
    .select("password_fingerprint")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(depth);
  if (error) fail("recentPasswordFingerprints", error);
  return (data ?? []).map((row) => row.password_fingerprint as string);
}

/* ------------------------------ login attempts ---------------------------- */

export async function recordLoginAttempt(input: {
  email: string;
  ipAddress: string;
  successful: boolean;
  reason?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("login_attempts").insert({
    email: input.email.toLowerCase(),
    ip_address: input.ipAddress,
    successful: input.successful,
    reason: input.reason ?? "",
  } as never);
  if (error) console.error("[identity-repository] recordLoginAttempt", error);
}

export async function countRecentFailures(email: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabaseAdmin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .ilike("email", email)
    .eq("successful", false)
    .gte("created_at", since);
  if (error) {
    console.error("[identity-repository] countRecentFailures", error);
    return 0;
  }
  return count ?? 0;
}

/* ---------------------------------- audit --------------------------------- */

export async function insertAuditEvent(event: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin.from("identity_audit_events").insert(event as never);
  if (error) console.error("[identity-repository] insertAuditEvent", error);
}

export async function listAuditEvents(
  userId: string,
  limit = 50,
): Promise<IdentityAuditEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("identity_audit_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listAuditEvents", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    organisationId: row.organisation_id,
    eventType: row.event_type,
    severity: row.severity,
    outcome: row.outcome,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  })) as IdentityAuditEvent[];
}
