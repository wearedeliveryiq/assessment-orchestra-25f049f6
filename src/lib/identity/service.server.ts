import { recordIdentityEvent, type RequestContext } from "./audit.server";
import { Errors } from "./errors";
import { canAssignRole, hasPermission, isPlatformRole } from "./rbac";
import * as repo from "./repository.server";
import { assertStatusTransition } from "./password-policy";
import type {
  AuthenticatedIdentity,
  IdentitySession,
  MembershipStatus,
  OrganisationInvitation,
  OrganisationMembership,
  PlatformRole,
  UserProfile,
  UserStatus,
} from "./types";

/**
 * IdentityService — profile, session, organisation-membership and invitation
 * operations for an already-authenticated caller. Authorisation decisions live
 * in `assertPermission` / `assertOrgRole` so every entry point is guarded the
 * same way.
 */

/* ----------------------------- authorisation ----------------------------- */

export function assertPermission(identity: AuthenticatedIdentity, permission: string): void {
  if (!hasPermission(identity.roles, permission)) throw Errors.forbidden();
}

export function assertOrgAdmin(identity: AuthenticatedIdentity, organisationId: string): void {
  if (identity.roles.includes("platform_admin")) return;
  const membership = identity.memberships.find(
    (entry) => entry.organisationId === organisationId && entry.status === "active",
  );
  if (!membership || !["org_admin"].includes(membership.role)) {
    throw Errors.forbidden("You must be an organisation administrator to do this.");
  }
}

/* -------------------------------- profile -------------------------------- */

export async function updateOwnProfile(
  identity: AuthenticatedIdentity,
  patch: Record<string, unknown>,
  context?: RequestContext,
): Promise<UserProfile> {
  const allowed: Record<string, unknown> = {};
  const text = (value: unknown, max = 80) =>
    typeof value === "string" && value.trim().length <= max ? value.trim() : undefined;

  const first = text(patch.firstName);
  const last = text(patch.lastName);
  const display = text(patch.displayName, 120);
  const language = text(patch.preferredLanguage, 16);
  const timezone = text(patch.timezone, 64);
  const image = text(patch.profileImage, 512);

  if (first !== undefined) allowed.first_name = first;
  if (last !== undefined) allowed.last_name = last;
  if (display !== undefined) allowed.display_name = display;
  if (language !== undefined) allowed.preferred_language = language;
  if (timezone !== undefined) allowed.timezone = timezone;
  if (image !== undefined) allowed.profile_image = image;
  if (Object.keys(allowed).length === 0) throw Errors.validation("Nothing to update.");

  const profile = await repo.updateProfile(identity.user.id, allowed);
  recordIdentityEvent({
    eventType: "profile.updated",
    userId: profile.id,
    email: profile.email,
    context,
    metadata: { fields: Object.keys(allowed) },
  });
  return profile;
}

/* -------------------------------- sessions ------------------------------- */

export function listOwnSessions(identity: AuthenticatedIdentity): Promise<IdentitySession[]> {
  return repo.listSessions(identity.user.id);
}

export async function revokeOwnSession(
  identity: AuthenticatedIdentity,
  sessionId: string,
  context?: RequestContext,
): Promise<void> {
  await repo.revokeSession(identity.user.id, sessionId);
  recordIdentityEvent({
    eventType: "auth.session_revoked",
    userId: identity.user.id,
    email: identity.user.email,
    context,
    metadata: { sessionId },
  });
}

export async function revokeAllOwnSessions(
  identity: AuthenticatedIdentity,
  context?: RequestContext,
): Promise<void> {
  await repo.revokeAllSessions(identity.user.id);
  recordIdentityEvent({
    eventType: "auth.session_revoked",
    userId: identity.user.id,
    email: identity.user.email,
    context,
    metadata: { scope: "all" },
  });
}

/* ------------------------------ memberships ------------------------------ */

export async function changeMemberRole(
  identity: AuthenticatedIdentity,
  input: { organisationId: string; userId: string; role: unknown },
  context?: RequestContext,
): Promise<OrganisationMembership> {
  assertOrgAdmin(identity, input.organisationId);
  if (!isPlatformRole(input.role)) throw Errors.validation("Unknown role.");
  if (!canAssignRole(identity.roles, input.role)) {
    throw Errors.forbidden("You cannot assign a role broader than your own.");
  }

  const existing = await repo.findMembership(input.userId, input.organisationId);
  if (!existing) throw Errors.notFound("This person is not a member of the organisation.");

  const membership = await repo.upsertMembership({
    userId: input.userId,
    organisationId: input.organisationId,
    role: input.role,
    status: existing.status as MembershipStatus,
  });
  recordIdentityEvent({
    eventType: "role.changed",
    userId: input.userId,
    organisationId: input.organisationId,
    context,
    metadata: { from: existing.role, to: input.role, actor: identity.user.id },
  });
  return membership;
}

export async function removeMember(
  identity: AuthenticatedIdentity,
  input: { organisationId: string; userId: string },
  context?: RequestContext,
): Promise<void> {
  assertOrgAdmin(identity, input.organisationId);
  await repo.removeMembership(input.userId, input.organisationId);
  recordIdentityEvent({
    eventType: "role.changed",
    userId: input.userId,
    organisationId: input.organisationId,
    context,
    metadata: { removedBy: identity.user.id },
  });
}

/* ------------------------------- invitations ----------------------------- */

const INVITATION_TTL_MS = 7 * 24 * 60 * 60_000;

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function inviteMember(
  identity: AuthenticatedIdentity,
  input: { organisationId: string; email: string; role: unknown },
  context?: RequestContext,
): Promise<{ invitation: OrganisationInvitation; token: string }> {
  assertOrgAdmin(identity, input.organisationId);
  const role: PlatformRole = isPlatformRole(input.role) ? input.role : "contributor";
  if (!canAssignRole(identity.roles, role)) throw Errors.forbidden();

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const invitation = await repo.createInvitation({
    organisationId: input.organisationId,
    email: String(input.email).toLowerCase(),
    role,
    tokenHash: await hashToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
    invitedBy: identity.user.id,
  });

  recordIdentityEvent({
    eventType: "invitation.created",
    userId: identity.user.id,
    email: invitation.email,
    organisationId: input.organisationId,
    context,
    metadata: { role },
  });

  return { invitation, token };
}

export async function acceptInvitation(
  identity: AuthenticatedIdentity,
  token: string,
  context?: RequestContext,
): Promise<OrganisationMembership> {
  const row = await repo.findInvitationByToken(await hashToken(token));
  if (!row || row.status !== "pending") throw Errors.invalidToken("This invitation is no longer valid.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await repo.markInvitation(row.id, { status: "expired" });
    throw Errors.invalidToken("This invitation has expired.");
  }
  if (String(row.email).toLowerCase() !== identity.user.email.toLowerCase()) {
    throw Errors.forbidden("This invitation was sent to a different email address.");
  }

  const membership = await repo.upsertMembership({
    userId: identity.user.id,
    organisationId: row.organisation_id,
    role: row.role as PlatformRole,
    status: "active",
    invitedBy: row.invited_by,
  });
  await repo.markInvitation(row.id, {
    status: "accepted",
    accepted_at: new Date().toISOString(),
    accepted_by: identity.user.id,
  });
  await repo.grantRole(identity.user.id, row.role as PlatformRole).catch(() => undefined);

  recordIdentityEvent({
    eventType: "invitation.accepted",
    userId: identity.user.id,
    email: identity.user.email,
    organisationId: row.organisation_id,
    context,
  });
  return membership;
}

export function listOrganisationInvitations(
  identity: AuthenticatedIdentity,
  organisationId: string,
): Promise<OrganisationInvitation[]> {
  assertOrgAdmin(identity, organisationId);
  return repo.listInvitations(organisationId);
}

/* ----------------------------- administration ---------------------------- */

export async function changeUserStatus(
  identity: AuthenticatedIdentity,
  input: { userId: string; status: UserStatus },
  context?: RequestContext,
): Promise<UserProfile> {
  assertPermission(identity, "user:manage");
  const target = await repo.findProfile(input.userId);
  if (!target) throw Errors.notFound("User not found.");
  assertStatusTransition(target.status, input.status);

  const profile = await repo.updateProfile(input.userId, { status: input.status });
  if (input.status !== "active") await repo.revokeAllSessions(input.userId);

  recordIdentityEvent({
    eventType: "account.status_changed",
    userId: input.userId,
    email: profile.email,
    context,
    metadata: { from: target.status, to: input.status, actor: identity.user.id },
  });
  return profile;
}
