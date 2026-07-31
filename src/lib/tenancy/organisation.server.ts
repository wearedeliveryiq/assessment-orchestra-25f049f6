import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { accessibleOrganisationIds, requireOrganisation, requireOrganisationAdmin } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import * as repo from "./repository.server";
import { TenantErrors } from "./roles";
import { defaultOrganisationSettings } from "./settings.server";
import { createWorkspace } from "./workspace.server";
import type { Organisation, OrganisationStatus, OrganisationSummary } from "./types";
import { optionalText, slugify, trimmed, uniqueSlug } from "./validation";

/**
 * OrganisationService — organisation lifecycle only (create, read, update,
 * archive). Membership, workspaces, settings and invitations live in their own
 * single-responsibility services.
 */

const STATUSES: OrganisationStatus[] = ["active", "suspended", "archived"];

export async function listOrganisations(
  identity: AuthenticatedIdentity,
  query?: string,
): Promise<OrganisationSummary[]> {
  const scope = await accessibleOrganisationIds(identity);
  const organisations =
    scope === "all" ? await repo.listAllOrganisations() : await repo.listOrganisationsByIds(scope);
  return decorate(identity, organisations, query);
}

export async function getOrganisationSummary(
  identity: AuthenticatedIdentity,
  organisationId: string,
): Promise<OrganisationSummary> {
  const { organisation } = await requireOrganisation(identity, organisationId);
  const [summary] = await decorate(identity, [organisation]);
  return summary;
}

async function decorate(
  identity: AuthenticatedIdentity,
  organisations: Organisation[],
  query?: string,
): Promise<OrganisationSummary[]> {
  const filtered = query
    ? organisations.filter((organisation) =>
        `${organisation.name} ${organisation.slug} ${organisation.industry}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : organisations;
  if (filtered.length === 0) return [];

  const ids = filtered.map((organisation) => organisation.id);
  const [workspaces, memberCounts, invitationCounts] = await Promise.all([
    repo.listWorkspacesForOrganisations(ids),
    repo.countOrganisationMembers(ids),
    repo.countPendingInvitations(ids),
  ]);

  const roleByOrganisation = new Map(
    identity.memberships.map((membership) => [membership.organisationId, membership.role]),
  );

  return filtered.map((organisation) => ({
    ...organisation,
    workspaceCount: workspaces.filter(
      (workspace) => workspace.organisationId === organisation.id && workspace.status === "active",
    ).length,
    memberCount: memberCounts.get(organisation.id) ?? 0,
    pendingInvitationCount: invitationCounts.get(organisation.id) ?? 0,
    role: roleByOrganisation.get(organisation.id) ?? null,
  }));
}

export interface CreateOrganisationInput {
  name: unknown;
  description?: unknown;
  industry?: unknown;
  organisationSize?: unknown;
  country?: unknown;
  timezone?: unknown;
  website?: unknown;
  logo?: unknown;
  subscriptionPlan?: unknown;
  branding?: { primaryColour?: unknown; accentColour?: unknown };
  defaultWorkspace?: { name?: unknown; description?: unknown; type?: unknown };
}

export async function createOrganisation(
  identity: AuthenticatedIdentity,
  input: CreateOrganisationInput,
  context?: RequestContext,
): Promise<OrganisationSummary> {
  const name = trimmed(input.name, 120);
  if (!name) throw TenantErrors.validation("An organisation name is required.");

  const base = slugify(name);
  if (!base) throw TenantErrors.validation("The organisation name must contain letters or digits.");
  const slug = uniqueSlug(base, await repo.listTakenOrganisationSlugs(base));

  const organisation = await repo.insertOrganisation({
    name,
    slug,
    description: optionalText(input.description, 500) ?? "",
    industry: optionalText(input.industry, 80) ?? "",
    organisation_size: optionalText(input.organisationSize, 40) ?? "",
    country: optionalText(input.country, 80) ?? "",
    timezone: optionalText(input.timezone, 64) || "Europe/London",
    website: optionalText(input.website, 255) ?? "",
    logo: optionalText(input.logo, 512) || null,
    subscription_plan: optionalText(input.subscriptionPlan, 40) || "trial",
    created_by: identity.user.id,
  });

  // The creator owns the organisation they just created.
  await repo.upsertOrganisationMembership({
    userId: identity.user.id,
    organisationId: organisation.id,
    role: "organisation_owner",
    status: "active",
  });

  const settings = defaultOrganisationSettings(organisation);
  await repo.upsertOrganisationSettingsRow(organisation.id, {
    general: settings.general,
    branding: {
      ...settings.branding,
      primaryColour: optionalText(input.branding?.primaryColour, 16) || settings.branding.primaryColour,
      accentColour: optionalText(input.branding?.accentColour, 16) || settings.branding.accentColour,
    },
    notifications: settings.notifications,
    security: settings.security,
  });

  recordTenantEvent({
    eventType: "organisation.created",
    actor: identity,
    organisationId: organisation.id,
    entityType: "organisation",
    entityId: organisation.id,
    summary: `Organisation "${organisation.name}" created`,
    context,
  });

  const workspaceName = trimmed(input.defaultWorkspace?.name, 120);
  if (workspaceName) {
    const refreshed: AuthenticatedIdentity = {
      ...identity,
      memberships: [
        ...identity.memberships,
        {
          id: "pending",
          userId: identity.user.id,
          organisationId: organisation.id,
          role: "organisation_owner",
          status: "active",
          joinedAt: new Date().toISOString(),
        },
      ],
    };
    await createWorkspace(
      refreshed,
      {
        organisationId: organisation.id,
        name: workspaceName,
        description: input.defaultWorkspace?.description,
        type: input.defaultWorkspace?.type,
      },
      context,
    );
  }

  return getOrganisationSummary(
    {
      ...identity,
      memberships: [
        ...identity.memberships,
        {
          id: "pending",
          userId: identity.user.id,
          organisationId: organisation.id,
          role: "organisation_owner",
          status: "active",
          joinedAt: new Date().toISOString(),
        },
      ],
    },
    organisation.id,
  );
}

export async function updateOrganisation(
  identity: AuthenticatedIdentity,
  organisationId: string,
  patch: Record<string, unknown>,
  context?: RequestContext,
): Promise<Organisation> {
  await requireOrganisationAdmin(identity, organisationId);

  const allowed: Record<string, unknown> = {};
  const map: Record<string, [string, number]> = {
    name: ["name", 120],
    description: ["description", 500],
    industry: ["industry", 80],
    organisationSize: ["organisation_size", 40],
    country: ["country", 80],
    timezone: ["timezone", 64],
    website: ["website", 255],
    logo: ["logo", 512],
    subscriptionPlan: ["subscription_plan", 40],
  };
  for (const [key, [column, max]] of Object.entries(map)) {
    const value = optionalText(patch[key], max);
    if (value !== undefined) allowed[column] = value;
  }
  if (typeof patch.status === "string" && STATUSES.includes(patch.status as OrganisationStatus)) {
    allowed.status = patch.status;
  }
  if (Object.keys(allowed).length === 0) throw TenantErrors.validation("Nothing to update.");
  if (allowed.name === "") throw TenantErrors.validation("An organisation name is required.");

  const organisation = await repo.updateOrganisationRow(organisationId, allowed);
  recordTenantEvent({
    eventType: allowed.status === "archived" ? "organisation.archived" : "organisation.updated",
    actor: identity,
    organisationId,
    entityType: "organisation",
    entityId: organisationId,
    summary: `Organisation "${organisation.name}" updated`,
    metadata: { fields: Object.keys(allowed) },
    context,
  });
  return organisation;
}

/** Organisations are archived, never destroyed: audit history must survive. */
export async function archiveOrganisation(
  identity: AuthenticatedIdentity,
  organisationId: string,
  context?: RequestContext,
): Promise<Organisation> {
  const access = await requireOrganisationAdmin(identity, organisationId, { write: false });
  if (!access.isPlatformAdmin && access.role !== "organisation_owner") {
    throw TenantErrors.forbidden("Only the organisation owner can archive an organisation.");
  }
  const organisation = await repo.updateOrganisationRow(organisationId, { status: "archived" });
  recordTenantEvent({
    eventType: "organisation.archived",
    actor: identity,
    organisationId,
    entityType: "organisation",
    entityId: organisationId,
    summary: `Organisation "${organisation.name}" archived`,
    context,
  });
  return organisation;
}
