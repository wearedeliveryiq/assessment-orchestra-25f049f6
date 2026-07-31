import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { requireOrganisation, requireOrganisationAdmin, requireWorkspace } from "./access.server";
import { recordTenantEvent, type RequestContext } from "./audit.server";
import * as repo from "./repository.server";
import { TenantErrors } from "./roles";
import type {
  Organisation,
  OrganisationSettings,
  WorkspaceSettings,
  WorkspaceVisibility,
} from "./types";
import { isHexColour, normaliseColour, optionalText } from "./validation";

/**
 * OrganisationSettingsService and WorkspaceSettingsService.
 *
 * Settings are stored as versionable JSON documents with a defaulted shape, so
 * new categories can be introduced without a schema migration while reads stay
 * strongly typed.
 */

export function defaultOrganisationSettings(organisation: Organisation): OrganisationSettings {
  return {
    organisationId: organisation.id,
    general: {
      name: organisation.name,
      logo: organisation.logo,
      industry: organisation.industry,
      website: organisation.website,
      timezone: organisation.timezone,
      locale: "en-GB",
    },
    branding: {
      primaryColour: "#5B8DEF",
      accentColour: "#8B5CF6",
      logo: organisation.logo,
      emailBranding: organisation.name,
    },
    notifications: {
      email: true,
      assessmentNotifications: true,
      weeklySummary: false,
      reports: true,
    },
    security: {
      sessionTimeoutMinutes: 480,
      passwordPolicy: "standard",
      mfaRequirement: "optional",
      allowedDomains: [],
    },
    updatedAt: organisation.updatedAt,
  };
}

function mergeOrganisationSettings(
  organisation: Organisation,
  row: Record<string, any> | null,
): OrganisationSettings {
  const defaults = defaultOrganisationSettings(organisation);
  if (!row) return defaults;
  return {
    organisationId: organisation.id,
    general: { ...defaults.general, ...(row.general ?? {}) },
    branding: { ...defaults.branding, ...(row.branding ?? {}) },
    notifications: { ...defaults.notifications, ...(row.notifications ?? {}) },
    security: { ...defaults.security, ...(row.security ?? {}) },
    updatedAt: row.updated_at ?? defaults.updatedAt,
  };
}

export async function getOrganisationSettings(
  identity: AuthenticatedIdentity,
  organisationId: string,
): Promise<OrganisationSettings> {
  const { organisation } = await requireOrganisation(identity, organisationId);
  return mergeOrganisationSettings(organisation, await repo.getOrganisationSettingsRow(organisationId));
}

export async function updateOrganisationSettings(
  identity: AuthenticatedIdentity,
  organisationId: string,
  patch: Record<string, unknown>,
  context?: RequestContext,
): Promise<OrganisationSettings> {
  const { organisation } = await requireOrganisationAdmin(identity, organisationId);
  const current = mergeOrganisationSettings(
    organisation,
    await repo.getOrganisationSettingsRow(organisationId),
  );

  const general = { ...current.general, ...sanitiseGeneral(patch.general) };
  const branding = { ...current.branding, ...sanitiseBranding(patch.branding) };
  const notifications = { ...current.notifications, ...sanitiseNotifications(patch.notifications) };
  const security = { ...current.security, ...sanitiseSecurity(patch.security) };

  const row = await repo.upsertOrganisationSettingsRow(organisationId, {
    general,
    branding,
    notifications,
    security,
  });

  // Keep the organisation record and its general settings in step.
  await repo.updateOrganisationRow(organisationId, {
    name: general.name,
    industry: general.industry,
    website: general.website,
    timezone: general.timezone,
    logo: branding.logo ?? general.logo,
  });

  recordTenantEvent({
    eventType: "settings.updated",
    actor: identity,
    organisationId,
    entityType: "organisation_settings",
    entityId: organisationId,
    summary: `Settings updated for "${general.name}"`,
    metadata: { categories: Object.keys(patch) },
    context,
  });

  return mergeOrganisationSettings({ ...organisation, ...general }, row);
}

function sanitiseGeneral(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const name = optionalText(input.name, 120);
  if (name) out.name = name;
  const industry = optionalText(input.industry, 80);
  if (industry !== undefined) out.industry = industry;
  const website = optionalText(input.website, 255);
  if (website !== undefined) out.website = website;
  const timezone = optionalText(input.timezone, 64);
  if (timezone) out.timezone = timezone;
  const locale = optionalText(input.locale, 16);
  if (locale) out.locale = locale;
  const logo = optionalText(input.logo, 512);
  if (logo !== undefined) out.logo = logo || null;
  return out;
}

function sanitiseBranding(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (isHexColour(input.primaryColour)) out.primaryColour = normaliseColour(input.primaryColour);
  if (isHexColour(input.accentColour)) out.accentColour = normaliseColour(input.accentColour);
  const logo = optionalText(input.logo, 512);
  if (logo !== undefined) out.logo = logo || null;
  const emailBranding = optionalText(input.emailBranding, 200);
  if (emailBranding !== undefined) out.emailBranding = emailBranding;
  return out;
}

function sanitiseNotifications(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ["email", "assessmentNotifications", "weeklySummary", "reports"]) {
    if (typeof input[key] === "boolean") out[key] = input[key];
  }
  return out;
}

function sanitiseSecurity(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof input.sessionTimeoutMinutes === "number") {
    const minutes = Math.round(input.sessionTimeoutMinutes);
    if (minutes < 5 || minutes > 43_200) {
      throw TenantErrors.validation("Session timeout must be between 5 minutes and 30 days.");
    }
    out.sessionTimeoutMinutes = minutes;
  }
  if (input.passwordPolicy === "standard" || input.passwordPolicy === "strict") {
    out.passwordPolicy = input.passwordPolicy;
  }
  if (input.mfaRequirement === "optional" || input.mfaRequirement === "required") {
    out.mfaRequirement = input.mfaRequirement;
  }
  if (Array.isArray(input.allowedDomains)) {
    const domains = input.allowedDomains
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(entry));
    out.allowedDomains = [...new Set(domains)].slice(0, 50);
  }
  return out;
}

/* ---------------------------- workspace settings --------------------------- */

function mergeWorkspaceSettings(
  workspace: { id: string; organisationId: string; name: string; description: string; colour: string; icon: string; visibility: WorkspaceVisibility; updatedAt: string },
  row: Record<string, any> | null,
): WorkspaceSettings {
  return {
    workspaceId: workspace.id,
    organisationId: workspace.organisationId,
    displayName: row?.display_name || workspace.name,
    description: row?.description ?? workspace.description,
    colour: row?.colour ?? workspace.colour,
    icon: row?.icon ?? workspace.icon,
    defaultKnowledgePacks: row?.default_knowledge_packs ?? [],
    archiveRules: { autoArchiveAfterDays: row?.archive_rules?.autoArchiveAfterDays ?? null },
    visibility: (row?.visibility ?? workspace.visibility) as WorkspaceVisibility,
    updatedAt: row?.updated_at ?? workspace.updatedAt,
  };
}

export async function getWorkspaceSettings(
  identity: AuthenticatedIdentity,
  workspaceId: string,
): Promise<WorkspaceSettings> {
  const { workspace } = await requireWorkspace(identity, workspaceId);
  return mergeWorkspaceSettings(workspace, await repo.getWorkspaceSettingsRow(workspaceId));
}

export async function updateWorkspaceSettings(
  identity: AuthenticatedIdentity,
  workspaceId: string,
  patch: Record<string, unknown>,
  context?: RequestContext,
): Promise<WorkspaceSettings> {
  const access = await requireWorkspace(identity, workspaceId, { write: true });
  if (!access.canManageWorkspace) {
    throw TenantErrors.forbidden("You must manage this workspace to change its settings.");
  }

  const next: Record<string, unknown> = {};
  const displayName = optionalText(patch.displayName, 120);
  if (displayName) next.display_name = displayName;
  const description = optionalText(patch.description, 500);
  if (description !== undefined) next.description = description;
  if (patch.colour !== undefined) next.colour = normaliseColour(patch.colour, access.workspace.colour);
  const icon = optionalText(patch.icon, 40);
  if (icon) next.icon = icon;
  if (patch.visibility === "private" || patch.visibility === "organisation") {
    next.visibility = patch.visibility;
  }
  if (Array.isArray(patch.defaultKnowledgePacks)) {
    next.default_knowledge_packs = patch.defaultKnowledgePacks
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, 25);
  }
  if (patch.archiveRules && typeof patch.archiveRules === "object") {
    const days = (patch.archiveRules as Record<string, unknown>).autoArchiveAfterDays;
    next.archive_rules = {
      autoArchiveAfterDays: typeof days === "number" && days > 0 ? Math.round(days) : null,
    };
  }
  if (Object.keys(next).length === 0) throw TenantErrors.validation("Nothing to update.");

  const row = await repo.upsertWorkspaceSettingsRow(workspaceId, access.workspace.organisationId, next);

  // Mirror presentation fields onto the workspace so lists stay consistent.
  const mirrored: Record<string, unknown> = {};
  if (next.colour) mirrored.colour = next.colour;
  if (next.icon) mirrored.icon = next.icon;
  if (next.visibility) mirrored.visibility = next.visibility;
  if (next.description !== undefined) mirrored.description = next.description;
  if (Object.keys(mirrored).length > 0) await repo.updateWorkspaceRow(workspaceId, mirrored);

  recordTenantEvent({
    eventType: "settings.updated",
    actor: identity,
    organisationId: access.workspace.organisationId,
    workspaceId,
    entityType: "workspace_settings",
    entityId: workspaceId,
    summary: `Settings updated for "${access.workspace.name}"`,
    metadata: { fields: Object.keys(next) },
    context,
  });

  return mergeWorkspaceSettings(access.workspace, row);
}
