/**
 * Tenancy domain types.
 *
 * The tenancy platform owns organisations, workspaces, membership and
 * collaboration only. It deliberately knows nothing about assessments,
 * knowledge packs, the intelligence runtime or reporting: those modules will
 * later hang off a workspace id, never the other way around.
 *
 * Client-safe (no server imports) so UI and services share one model.
 */

import type { PlatformRole } from "@/lib/identity/types";

export type { PlatformRole };

export type OrganisationStatus = "active" | "suspended" | "archived";
export type WorkspaceStatus = "active" | "archived";
export type TenantMembershipStatus = "invited" | "active" | "suspended" | "removed";
export type WorkspaceVisibility = "organisation" | "private";

/* ------------------------------ organisation ------------------------------ */

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  organisationSize: string;
  country: string;
  timezone: string;
  logo: string | null;
  website: string;
  status: OrganisationStatus;
  subscriptionPlan: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationSummary extends Organisation {
  workspaceCount: number;
  memberCount: number;
  pendingInvitationCount: number;
  /** The caller's role in this organisation. */
  role: PlatformRole | null;
}

/* -------------------------------- workspace ------------------------------- */

export interface WorkspaceType {
  code: string;
  label: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface Workspace {
  id: string;
  organisationId: string;
  organisationName?: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  status: WorkspaceStatus;
  colour: string;
  icon: string;
  visibility: WorkspaceVisibility;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary extends Workspace {
  memberCount: number;
  favourite: boolean;
  role: PlatformRole | null;
  lastVisitedAt: string | null;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  organisationId: string;
  userId: string;
  role: PlatformRole;
  status: TenantMembershipStatus;
  favourite: boolean;
  joinedAt: string;
}

/* -------------------------------- members --------------------------------- */

export interface MemberView {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  profileImage: string | null;
  organisationId: string;
  role: PlatformRole;
  status: TenantMembershipStatus;
  joinedAt: string;
  workspaces: { id: string; name: string; role: PlatformRole }[];
}

/* ------------------------------ invitations ------------------------------- */

export interface TenantInvitation {
  id: string;
  organisationId: string;
  organisationName?: string;
  workspaceId: string | null;
  email: string;
  role: PlatformRole;
  workspaceRole: PlatformRole | null;
  message: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

/* -------------------------------- settings -------------------------------- */

export interface OrganisationGeneralSettings {
  name: string;
  logo: string | null;
  industry: string;
  website: string;
  timezone: string;
  locale: string;
}

export interface OrganisationBrandingSettings {
  primaryColour: string;
  accentColour: string;
  logo: string | null;
  emailBranding: string;
}

export interface OrganisationNotificationSettings {
  email: boolean;
  assessmentNotifications: boolean;
  weeklySummary: boolean;
  reports: boolean;
}

export interface OrganisationSecuritySettings {
  sessionTimeoutMinutes: number;
  passwordPolicy: "standard" | "strict";
  mfaRequirement: "optional" | "required";
  allowedDomains: string[];
}

export interface OrganisationSettings {
  organisationId: string;
  general: OrganisationGeneralSettings;
  branding: OrganisationBrandingSettings;
  notifications: OrganisationNotificationSettings;
  security: OrganisationSecuritySettings;
  updatedAt: string;
}

export interface WorkspaceSettings {
  workspaceId: string;
  organisationId: string;
  displayName: string;
  description: string;
  colour: string;
  icon: string;
  defaultKnowledgePacks: string[];
  archiveRules: { autoArchiveAfterDays: number | null };
  visibility: WorkspaceVisibility;
  updatedAt: string;
}

/* ------------------------------- switching -------------------------------- */

export interface WorkspaceContext {
  currentWorkspace: WorkspaceSummary | null;
  organisation: Organisation | null;
  recent: WorkspaceSummary[];
  favourites: WorkspaceSummary[];
  organisations: OrganisationSummary[];
  workspaces: WorkspaceSummary[];
}

export interface WorkspaceVisit {
  workspaceId: string;
  organisationId: string;
  visitCount: number;
  lastVisitedAt: string;
}

/* ------------------------------ notifications ----------------------------- */

export type TenantNotificationType =
  | "invitation.accepted"
  | "member.added"
  | "member.removed"
  | "workspace.created"
  | "workspace.archived"
  | "role.changed";

export interface PlatformNotification {
  id: string;
  userId: string;
  organisationId: string | null;
  workspaceId: string | null;
  module: string;
  eventType: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "error";
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/* --------------------------------- audit ---------------------------------- */

export type TenantAuditEventType =
  | "organisation.created"
  | "organisation.updated"
  | "organisation.archived"
  | "workspace.created"
  | "workspace.updated"
  | "workspace.deleted"
  | "member.added"
  | "member.removed"
  | "member.suspended"
  | "member.reinstated"
  | "invitation.sent"
  | "invitation.accepted"
  | "role.changed"
  | "workspace.switched"
  | "settings.updated";

export interface TenantAuditEvent {
  id: string;
  organisationId: string | null;
  workspaceId: string | null;
  actorId: string | null;
  actorEmail: string;
  eventType: TenantAuditEventType;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/* --------------------------------- search --------------------------------- */

export interface TenantSearchResults {
  organisations: OrganisationSummary[];
  workspaces: WorkspaceSummary[];
  members: MemberView[];
}
