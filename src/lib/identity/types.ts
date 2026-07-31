/**
 * Identity platform domain types.
 *
 * This module is deliberately free of any assessment, knowledge-pack or
 * intelligence-runtime concepts: the identity platform provides identity only.
 * It is client-safe (no server imports) so both UI and services share one model.
 */

export type PlatformRole =
  | "platform_admin"
  | "organisation_owner"
  | "org_admin"
  | "workspace_manager"
  | "assessment_manager"
  | "contributor"
  | "reviewer"
  | "read_only";

export type UserStatus = "pending_verification" | "active" | "locked" | "suspended" | "disabled";

export type MembershipStatus = "invited" | "active" | "removed";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** User entity as exposed to the application (never contains credentials). */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  status: UserStatus;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  profileImage: string | null;
  preferredLanguage: string;
  timezone: string;
  mfaEnabled: boolean;
  passwordChangedAt: string;
}

export interface IdentitySession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  revoked: boolean;
  rememberMe: boolean;
  current?: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface OrganisationMembership {
  id: string;
  userId: string;
  organisationId: string;
  organisationName?: string;
  role: PlatformRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface OrganisationInvitation {
  id: string;
  organisationId: string;
  email: string;
  role: PlatformRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

/** Credentials + tokens handed back to the browser after a successful login. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export interface AuthenticatedIdentity {
  user: UserProfile;
  roles: PlatformRole[];
  memberships: OrganisationMembership[];
  permissions: string[];
}

export interface LoginResult {
  identity: AuthenticatedIdentity;
  tokens: AuthTokens;
  session: IdentitySession;
}

export type IdentityAuditEventType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.locked"
  | "auth.session_revoked"
  | "password.changed"
  | "password.reset_requested"
  | "password.reset_completed"
  | "account.created"
  | "account.status_changed"
  | "email.verified"
  | "email.verification_resent"
  | "invitation.created"
  | "invitation.accepted"
  | "role.changed"
  | "profile.updated"
  | "mfa.enabled"
  | "mfa.disabled";

export interface IdentityAuditEvent {
  id: string;
  userId: string | null;
  email: string;
  organisationId: string | null;
  eventType: IdentityAuditEventType;
  severity: "info" | "warning" | "error";
  outcome: "success" | "failure";
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Consistent REST envelope used by every /api/auth endpoint. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
