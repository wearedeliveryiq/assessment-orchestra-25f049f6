import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { assertCanAssign, requireOrganisation, requireOrganisationAdmin } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import { notify } from "./notifications.server";
import * as repo from "./repository.server";
import { isOrganisationRole, TenantErrors } from "./roles";
import type { MemberView, PlatformRole, TenantMembershipStatus } from "./types";
import { isUuid, matches } from "./validation";

/**
 * MembershipService — organisation membership lifecycle: add, remove, suspend,
 * reinstate and change role. Membership is deliberately independent from
 * authentication: a person can exist without a membership and a membership can
 * be suspended without touching their credentials.
 */

export async function listMembers(
  identity: AuthenticatedIdentity,
  organisationId: string,
  query?: string,
): Promise<MemberView[]> {
  await requireOrganisation(identity, organisationId);
  const members = await repo.listOrganisationMembers(organisationId);
  if (!query) return members;
  return members.filter((member) => matches(`${member.displayName} ${member.email}`, query));
}

async function resolveMembership(identity: AuthenticatedIdentity, membershipId: string) {
  if (!isUuid(membershipId)) throw TenantErrors.validation("A valid membership is required.");
  const membership = await repo.findMembershipById(membershipId);
  if (!membership) throw TenantErrors.notFound("Membership not found.");
  const access = await requireOrganisationAdmin(identity, membership.organisationId);
  return { membership, access };
}

export async function addMember(
  identity: AuthenticatedIdentity,
  input: { organisationId: string; userId: string; role: unknown },
  context?: RequestContext,
): Promise<MemberView[]> {
  const access = await requireOrganisationAdmin(identity, input.organisationId);
  const role: PlatformRole = isOrganisationRole(input.role) ? input.role : "contributor";
  assertCanAssign(access, role, identity.roles);

  await repo.upsertOrganisationMembership({
    userId: input.userId,
    organisationId: input.organisationId,
    role,
    status: "active",
    invitedBy: identity.user.id,
  });

  recordTenantEvent({
    eventType: "member.added",
    actor: identity,
    organisationId: input.organisationId,
    entityType: "membership",
    entityId: input.userId,
    summary: "Member added to organisation",
    metadata: { role },
    context,
  });
  notify({
    recipients: [input.userId],
    eventType: "member.added",
    body: `You were added to ${access.organisation.name}.`,
    organisationId: input.organisationId,
  });

  return listMembers(identity, input.organisationId);
}

export async function changeMemberRole(
  identity: AuthenticatedIdentity,
  membershipId: string,
  role: unknown,
  context?: RequestContext,
): Promise<MemberView[]> {
  const { membership, access } = await resolveMembership(identity, membershipId);
  if (!isOrganisationRole(role)) throw TenantErrors.validation("Unknown role.");
  assertCanAssign(access, role, identity.roles);
  if (membership.role === "organisation_owner" && !access.isPlatformAdmin && access.role !== "organisation_owner") {
    throw TenantErrors.forbidden("Only an owner can change another owner's role.");
  }

  await repo.upsertOrganisationMembership({
    userId: membership.userId,
    organisationId: membership.organisationId,
    role,
    status: membership.status,
  });

  recordTenantEvent({
    eventType: "role.changed",
    actor: identity,
    organisationId: membership.organisationId,
    entityType: "membership",
    entityId: membership.userId,
    summary: `Role changed from ${membership.role} to ${role}`,
    metadata: { from: membership.role, to: role },
    context,
  });
  notify({
    recipients: [membership.userId],
    eventType: "role.changed",
    body: `Your role in ${access.organisation.name} is now ${role.replace(/_/g, " ")}.`,
    organisationId: membership.organisationId,
  });

  return listMembers(identity, membership.organisationId);
}

export async function setMemberStatus(
  identity: AuthenticatedIdentity,
  membershipId: string,
  status: TenantMembershipStatus,
  context?: RequestContext,
): Promise<MemberView[]> {
  const { membership, access } = await resolveMembership(identity, membershipId);
  if (membership.userId === identity.user.id) {
    throw TenantErrors.validation("You cannot change your own membership status.");
  }
  if (membership.role === "organisation_owner" && !access.isPlatformAdmin) {
    throw TenantErrors.forbidden("The organisation owner cannot be suspended or removed.");
  }

  await repo.upsertOrganisationMembership({
    userId: membership.userId,
    organisationId: membership.organisationId,
    role: membership.role,
    status,
  });
  if (status === "removed") {
    await repo.removeAllWorkspaceMembershipsInOrganisation(
      membership.organisationId,
      membership.userId,
    );
  }

  recordTenantEvent({
    eventType:
      status === "removed"
        ? "member.removed"
        : status === "suspended"
          ? "member.suspended"
          : "member.reinstated",
    actor: identity,
    organisationId: membership.organisationId,
    entityType: "membership",
    entityId: membership.userId,
    summary: `Membership ${status}`,
    context,
  });
  if (status === "removed") {
    notify({
      recipients: [membership.userId],
      eventType: "member.removed",
      body: `You no longer have access to ${access.organisation.name}.`,
      severity: "warning",
      organisationId: membership.organisationId,
    });
  }

  return listMembers(identity, membership.organisationId);
}
