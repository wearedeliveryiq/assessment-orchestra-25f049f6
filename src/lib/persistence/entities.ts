import type { BaseEntity, TenantEntity } from "./types";

/**
 * Canonical platform entity models.
 *
 * These are the domain shapes repositories return. They are deliberately
 * decoupled from storage column names and from any ORM type, so the storage
 * engine can change without touching a single domain service.
 */

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  profileImage: string | null;
  preferredLanguage: string;
  timezone: string;
  mfaEnabled: boolean;
}

export interface Organisation extends BaseEntity {
  name: string;
  slug: string;
  description: string;
  industry: string;
  organisationSize: string;
  country: string;
  timezone: string;
  website: string;
  logo: string | null;
  status: string;
  subscriptionPlan: string;
}

export interface OrganisationMembership extends BaseEntity {
  organisationId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  invitedBy: string | null;
}

export interface Workspace extends TenantEntity {
  organisationId: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  status: string;
  colour: string;
  icon: string;
  visibility: string;
}

export interface WorkspaceMembership extends BaseEntity {
  workspaceId: string;
  userId: string;
  role: string;
  status: string;
  favourite: boolean;
  joinedAt: string;
}

export type KnowledgePackStatus = "draft" | "published" | "deprecated" | "archived";

export interface KnowledgePack extends TenantEntity {
  packId: string;
  packVersion: string;
  name: string;
  description: string;
  category: string;
  status: KnowledgePackStatus;
  source: string;
  tags: string[];
  definition: Record<string, unknown>;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
}

export interface AssessmentSessionRecord extends TenantEntity {
  ownerKey: string;
  organisationName: string;
  contactName: string | null;
  assessmentType: string;
  status: string;
  currentSection: string | null;
  progress: number;
  metadata: Record<string, unknown>;
  submittedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
}

export interface AssessmentResponseRecord extends BaseEntity {
  sessionId: string;
  sectionId: string;
  questionId: string;
  value: unknown;
  score: number | null;
  notes: string | null;
  answeredAt: string;
}

export interface Notification extends BaseEntity {
  userId: string;
  organisationId: string | null;
  workspaceId: string | null;
  module: string;
  eventType: string;
  title: string;
  body: string;
  severity: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditEventRecord {
  id: string;
  timestamp: string;
  organisationId: string;
  assessmentSessionId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  userId: string;
  correlationId: string;
  severity: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  archivedAt: string | null;
  expiresAt: string | null;
}

export type SettingScope = "platform" | "organisation" | "workspace";

export interface PlatformSetting extends BaseEntity {
  scope: SettingScope;
  scopeId: string | null;
  key: string;
  value: unknown;
  description: string;
  organisationId: string | null;
  workspaceId: string | null;
}

export interface RetentionPolicy extends BaseEntity {
  entity: string;
  organisationId: string | null;
  mode: "retain" | "archive" | "purge";
  retainDays: number | null;
  enabled: boolean;
  description: string;
  lastAppliedAt: string | null;
}
