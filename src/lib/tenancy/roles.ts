/**
 * Tenant errors and role catalogue.
 *
 * Reuses the identity error envelope so every platform service speaks the same
 * HTTP contract; the tenancy layer only adds tenancy-specific reasons.
 */

import { IdentityError } from "@/lib/identity/errors";
import { ROLE_DEFINITIONS, roleDefinition } from "@/lib/identity/rbac";
import type { PlatformRole } from "./types";

export { IdentityError as TenantError };

export const TenantErrors = {
  validation: (message: string) => new IdentityError("validation_failed", message, 400),
  notFound: (message = "Not found.") => new IdentityError("not_found", message, 404),
  forbidden: (message = "You do not have access to this organisation.") =>
    new IdentityError("forbidden", message, 403),
  conflict: (message: string) => new IdentityError("conflict", message, 409),
  organisationSuspended: () =>
    new IdentityError(
      "organisation_suspended",
      "This organisation is suspended. Contact your administrator.",
      403,
    ),
  organisationArchived: () =>
    new IdentityError("organisation_archived", "This organisation is archived and read-only.", 409),
  workspaceArchived: () =>
    new IdentityError("workspace_archived", "This workspace is archived and read-only.", 409),
  invitationInvalid: () =>
    new IdentityError("invitation_invalid", "This invitation is no longer valid.", 400),
  invitationExpired: () =>
    new IdentityError("invitation_expired", "This invitation has expired.", 400),
  internal: (detail?: unknown) =>
    new IdentityError("internal_error", "Something went wrong. Please try again.", 500, detail),
};

/** Roles assignable inside an organisation, broadest first. */
export const ORGANISATION_ROLES: PlatformRole[] = [
  "organisation_owner",
  "org_admin",
  "workspace_manager",
  "assessment_manager",
  "contributor",
  "reviewer",
  "read_only",
];

/** Roles assignable inside a workspace. */
export const WORKSPACE_ROLES: PlatformRole[] = [
  "workspace_manager",
  "assessment_manager",
  "contributor",
  "reviewer",
  "read_only",
];

export const TENANT_ROLE_OPTIONS = ROLE_DEFINITIONS.filter((definition) =>
  ORGANISATION_ROLES.includes(definition.role),
).map(({ role, label, description, rank }) => ({ role, label, description, rank }));

export function isOrganisationRole(value: unknown): value is PlatformRole {
  return ORGANISATION_ROLES.includes(value as PlatformRole);
}

export function isWorkspaceRole(value: unknown): value is PlatformRole {
  return WORKSPACE_ROLES.includes(value as PlatformRole);
}

export function rankOf(role: PlatformRole): number {
  return roleDefinition(role).rank;
}

/** Administrative roles inside an organisation. */
export function isOrganisationAdminRole(role: PlatformRole | null | undefined): boolean {
  return role === "organisation_owner" || role === "org_admin";
}
