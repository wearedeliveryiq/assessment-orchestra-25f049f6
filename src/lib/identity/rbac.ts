import type { PlatformRole } from "./types";

/**
 * Role-Based Access Control.
 *
 * Roles and permissions are described declaratively so new roles can be added
 * (or loaded from configuration later) without touching authorisation logic.
 */

export interface RoleDefinition {
  role: PlatformRole;
  label: string;
  description: string;
  /** Platform roles are never valid organisation or workspace membership roles. */
  scope: "platform" | "tenant";
  /** Higher rank implies a broader remit; used for role-change guard rails. */
  rank: number;
  permissions: string[];
}

const READ_ONLY = ["assessment:read", "dashboard:read", "report:read"];
const REVIEWER = [...READ_ONLY, "assessment:comment"];
const CONTRIBUTOR = [...REVIEWER, "assessment:respond"];
const MANAGER = [...CONTRIBUTOR, "assessment:create", "assessment:submit", "report:generate"];
const WORKSPACE_MANAGER = [
  ...MANAGER,
  "workspace:read",
  "workspace:manage",
  "workspace:member_manage",
  "teammate.activate",
];
const ORG_ADMIN = [
  ...WORKSPACE_MANAGER,
  "organisation:read",
  "organisation:manage",
  "workspace:create",
  "workspace:archive",
  "member:invite",
  "member:remove",
  "member:role_change",
];
const ORG_OWNER = [...ORG_ADMIN, "organisation:delete", "organisation:billing"];
const PLATFORM_ADMIN = [
  ...ORG_OWNER,
  "platform:manage",
  "organisation:create",
  "audit:read",
  "user:manage",
];
const PRODUCT_GOVERNANCE = ["recommendation:govern"];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: "platform_admin",
    label: "Platform Administrator",
    description: "Full control of the platform, tenants and identity administration.",
    scope: "platform",
    rank: 70,
    permissions: PLATFORM_ADMIN,
  },
  {
    role: "product_governance",
    label: "Product Governance",
    description: "Authors and approves governed product configuration without tenant access.",
    scope: "platform",
    rank: 0,
    permissions: PRODUCT_GOVERNANCE,
  },
  {
    role: "organisation_owner",
    label: "Organisation Owner",
    description: "Owns an organisation, its subscription and its administrators.",
    scope: "tenant",
    rank: 60,
    permissions: ORG_OWNER,
  },
  {
    role: "org_admin",
    label: "Organisation Administrator",
    description: "Administers a single organisation, its workspaces, members and invitations.",
    scope: "tenant",
    rank: 50,
    permissions: ORG_ADMIN,
  },
  {
    role: "workspace_manager",
    label: "Workspace Manager",
    description: "Manages a workspace and the people working inside it.",
    scope: "tenant",
    rank: 45,
    permissions: WORKSPACE_MANAGER,
  },
  {
    role: "assessment_manager",
    label: "Assessment Manager",
    description: "Creates and manages work within an organisation.",
    scope: "tenant",
    rank: 40,
    permissions: MANAGER,
  },

  {
    role: "contributor",
    label: "Contributor",
    description: "Contributes content and responses.",
    scope: "tenant",
    rank: 30,
    permissions: CONTRIBUTOR,
  },
  {
    role: "reviewer",
    label: "Reviewer",
    description: "Reviews and comments without editing.",
    scope: "tenant",
    rank: 20,
    permissions: REVIEWER,
  },
  {
    role: "read_only",
    label: "Read Only",
    description: "View-only access.",
    scope: "tenant",
    rank: 10,
    permissions: READ_ONLY,
  },
];

const BY_ROLE = new Map(ROLE_DEFINITIONS.map((definition) => [definition.role, definition]));

export const ALL_ROLES: PlatformRole[] = ROLE_DEFINITIONS.map((definition) => definition.role);

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && BY_ROLE.has(value as PlatformRole);
}

export function roleDefinition(role: PlatformRole): RoleDefinition {
  const definition = BY_ROLE.get(role);
  if (!definition) throw new Error(`Unknown role: ${role}`);
  return definition;
}

export function roleLabel(role: PlatformRole): string {
  return BY_ROLE.get(role)?.label ?? role;
}

/** Union of every permission granted by the supplied roles. */
export function permissionsFor(roles: PlatformRole[]): string[] {
  const granted = new Set<string>();
  for (const role of roles) {
    for (const permission of BY_ROLE.get(role)?.permissions ?? []) granted.add(permission);
  }
  return [...granted].sort();
}

export function hasPermission(roles: PlatformRole[], permission: string): boolean {
  return permissionsFor(roles).includes(permission);
}

export function hasAnyPermission(roles: PlatformRole[], permissions: string[]): boolean {
  const granted = new Set(permissionsFor(roles));
  return permissions.some((permission) => granted.has(permission));
}

/**
 * Tenant roles may only be assigned by a platform administrator or someone
 * whose own tenant-role rank is greater or equal. Platform roles use a
 * separate governed provisioning path and can never be written to membership
 * records through this guard.
 */
export function canAssignRole(actorRoles: PlatformRole[], target: PlatformRole): boolean {
  if (roleDefinition(target).scope !== "tenant") return false;
  if (actorRoles.includes("platform_admin")) return true;
  const actorRank = Math.max(
    0,
    ...actorRoles.map((role) => {
      const definition = BY_ROLE.get(role);
      return definition?.scope === "tenant" ? definition.rank : 0;
    }),
  );
  return actorRank >= roleDefinition(target).rank;
}
