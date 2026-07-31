import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { assertCanAssign, requireOrganisation, requireOrganisationAdmin } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import { notify } from "./notifications.server";
import * as repo from "./repository.server";
import { isOrganisationRole, isWorkspaceRole, TenantErrors } from "./roles";
import type { PlatformRole, TenantInvitation } from "./types";
import { isEmail, isUuid, optionalText } from "./validation";

/**
 * InvitationService — invite, accept, resend and revoke.
 *
 * Tokens are never stored: only a SHA-256 hash is persisted, so a database
 * leak cannot be replayed into organisation access.
 */

const INVITATION_TTL_MS = 7 * 24 * 60 * 60_000;

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function listInvitations(
  identity: AuthenticatedIdentity,
  organisationId: string,
): Promise<TenantInvitation[]> {
  await requireOrganisationAdmin(identity, organisationId, { write: false });
  return repo.listInvitations(organisationId);
}

export async function inviteMember(
  identity: AuthenticatedIdentity,
  input: Record<string, unknown>,
  context?: RequestContext,
): Promise<{ invitation: TenantInvitation; token: string }> {
  if (typeof input.organisationId !== "string") {
    throw TenantErrors.validation("An organisation is required.");
  }
  const access = await requireOrganisationAdmin(identity, input.organisationId);
  if (!isEmail(input.email)) throw TenantErrors.validation("A valid email address is required.");

  const role: PlatformRole = isOrganisationRole(input.role) ? input.role : "contributor";
  assertCanAssign(access, role, identity.roles);

  const email = input.email.toLowerCase();
  const allowedDomains = await allowedDomainsFor(input.organisationId);
  if (allowedDomains.length > 0) {
    const domain = email.split("@")[1] ?? "";
    if (!allowedDomains.includes(domain)) {
      throw TenantErrors.validation(
        `Invitations are restricted to: ${allowedDomains.join(", ")}.`,
      );
    }
  }

  let workspaceId: string | null = null;
  if (typeof input.workspaceId === "string" && input.workspaceId) {
    if (!isUuid(input.workspaceId)) throw TenantErrors.validation("A valid workspace is required.");
    const workspace = await repo.getWorkspace(input.workspaceId);
    if (!workspace || workspace.organisationId !== input.organisationId) {
      throw TenantErrors.notFound("Workspace not found.");
    }
    if (workspace.status === "archived") throw TenantErrors.workspaceArchived();
    workspaceId = workspace.id;
  }

  const existing = (await repo.listInvitations(input.organisationId)).find(
    (invitation) => invitation.email === email && invitation.status === "pending",
  );
  if (existing) throw TenantErrors.conflict("An invitation is already pending for this address.");

  const days =
    typeof input.expiresInDays === "number" && input.expiresInDays > 0 && input.expiresInDays <= 30
      ? input.expiresInDays
      : 7;
  const token = newToken();

  const invitation = await repo.insertInvitation({
    organisation_id: input.organisationId,
    email,
    role,
    workspace_id: workspaceId,
    workspace_role: isWorkspaceRole(input.workspaceRole) ? input.workspaceRole : null,
    message: optionalText(input.message, 500) ?? "",
    status: "pending",
    token_hash: await hashToken(token),
    expires_at: new Date(Date.now() + days * 24 * 60 * 60_000).toISOString(),
    invited_by: identity.user.id,
  });

  recordTenantEvent({
    eventType: "invitation.sent",
    actor: identity,
    organisationId: input.organisationId,
    workspaceId,
    entityType: "invitation",
    entityId: invitation.id,
    summary: `Invitation sent to ${email}`,
    metadata: { role, workspaceId },
    context,
  });

  return { invitation, token };
}

async function allowedDomainsFor(organisationId: string): Promise<string[]> {
  const row = await repo.getOrganisationSettingsRow(organisationId);
  const domains = (row?.security as Record<string, unknown> | undefined)?.allowedDomains;
  return Array.isArray(domains) ? (domains as string[]) : [];
}

export async function acceptInvitation(
  identity: AuthenticatedIdentity,
  token: unknown,
  context?: RequestContext,
): Promise<TenantInvitation> {
  if (typeof token !== "string" || token.length < 16) throw TenantErrors.invitationInvalid();
  const invitation = await repo.findInvitationByTokenHash(await hashToken(token));
  if (!invitation || invitation.status !== "pending") throw TenantErrors.invitationInvalid();
  if (Date.parse(invitation.expiresAt) < Date.now()) {
    await repo.updateInvitationRow(invitation.id, { status: "expired" });
    throw TenantErrors.invitationExpired();
  }
  if (invitation.email.toLowerCase() !== identity.user.email.toLowerCase()) {
    throw TenantErrors.forbidden("This invitation was sent to a different email address.");
  }

  await repo.upsertOrganisationMembership({
    userId: identity.user.id,
    organisationId: invitation.organisationId,
    role: invitation.role,
    status: "active",
  });

  if (invitation.workspaceId) {
    await repo.upsertWorkspaceMembership({
      workspaceId: invitation.workspaceId,
      userId: identity.user.id,
      role: invitation.workspaceRole ?? "contributor",
    });
  }

  const accepted = await repo.updateInvitationRow(invitation.id, {
    status: "accepted",
    accepted_at: new Date().toISOString(),
    accepted_by: identity.user.id,
  });

  recordTenantEvent({
    eventType: "invitation.accepted",
    actor: identity,
    organisationId: invitation.organisationId,
    workspaceId: invitation.workspaceId,
    entityType: "invitation",
    entityId: invitation.id,
    summary: `${identity.user.email} accepted their invitation`,
    context,
  });

  const admins = (await repo.listOrganisationMembers(invitation.organisationId))
    .filter((member) => member.role === "org_admin" || member.role === "organisation_owner")
    .map((member) => member.userId);
  notify({
    recipients: admins,
    eventType: "invitation.accepted",
    body: `${identity.user.displayName ?? identity.user.email} joined the organisation.`,
    organisationId: invitation.organisationId,
    workspaceId: invitation.workspaceId,
  });

  return accepted;
}

export async function revokeInvitation(
  identity: AuthenticatedIdentity,
  invitationId: string,
  context?: RequestContext,
): Promise<TenantInvitation> {
  if (!isUuid(invitationId)) throw TenantErrors.validation("A valid invitation is required.");
  const existing = await repo.findInvitationById(invitationId);
  if (!existing) throw TenantErrors.notFound("Invitation not found.");
  await requireOrganisationAdmin(identity, existing.organisationId);

  const invitation = await repo.updateInvitationRow(invitationId, { status: "revoked" });
  recordTenantEvent({
    eventType: "invitation.sent",
    actor: identity,
    organisationId: invitation.organisationId,
    entityType: "invitation",
    entityId: invitation.id,
    summary: `Invitation to ${invitation.email} revoked`,
    context,
  });
  return invitation;
}

/** Invitations pending for the signed-in user's email address. */
export async function myPendingInvitations(
  identity: AuthenticatedIdentity,
): Promise<TenantInvitation[]> {
  const organisationIds = identity.memberships.map((membership) => membership.organisationId);
  const lists = await Promise.all(
    organisationIds.map(async (organisationId) => {
      await requireOrganisation(identity, organisationId).catch(() => null);
      return repo.listInvitations(organisationId);
    }),
  );
  return lists
    .flat()
    .filter(
      (invitation) =>
        invitation.status === "pending" &&
        invitation.email.toLowerCase() === identity.user.email.toLowerCase(),
    );
}
