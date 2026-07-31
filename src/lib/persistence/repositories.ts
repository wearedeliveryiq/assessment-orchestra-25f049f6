import { BaseRepository, baseEntityFrom, type RepositoryConfig } from "./repository";
import type {
  AssessmentResponseRecord,
  AssessmentSessionRecord,
  KnowledgePack,
  Notification,
  Organisation,
  OrganisationMembership,
  PlatformSetting,
  RetentionPolicy,
  User,
  Workspace,
  WorkspaceMembership,
} from "./entities";
import { CacheTags, CACHE_TTL, cached, invalidateTag } from "./cache";
import type { DataSource, Filter, Page, QueryOptions, Row, TenantContext } from "./types";
import type { EntitySchema } from "./validation";

/**
 * Aggregate repositories.
 *
 * Each one owns a table, a validation schema and a row→domain mapper, and
 * exposes *domain-focused* methods (`findBySlug`, `markRead`, `publish`)
 * rather than raw CRUD wherever a meaningful operation exists.
 *
 * Every repository takes its DataSource by injection, which is what allows the
 * whole layer to be tested without a database.
 */

const json = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const list = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

/* ---------------------------------- User ---------------------------------- */

const userSchema: EntitySchema = {
  email: { type: "string", required: true, maxLength: 320, pattern: /.+@.+\..+/ },
  firstName: { type: "string", maxLength: 120 },
  lastName: { type: "string", maxLength: 120 },
  displayName: { type: "string", maxLength: 200 },
  status: { type: "string", maxLength: 40 },
  emailVerified: { type: "boolean" },
  profileImage: { type: "string", maxLength: 2048 },
  preferredLanguage: { type: "string", maxLength: 16 },
  timezone: { type: "string", maxLength: 64 },
  mfaEnabled: { type: "boolean" },
  lastLoginAt: { type: "iso-date" },
};

const userConfig: RepositoryConfig<User> = {
  entity: "user",
  table: "identity_profiles",
  schema: userSchema,
  tenantScope: "none",
  toDomain: (row: Row): User => ({
    ...baseEntityFrom(row),
    email: String(row.email ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    displayName: String(row.display_name ?? ""),
    status: String(row.status ?? "active"),
    emailVerified: Boolean(row.email_verified),
    lastLoginAt: (row.last_login_at as string) ?? null,
    profileImage: (row.profile_image as string) ?? null,
    preferredLanguage: String(row.preferred_language ?? "en-GB"),
    timezone: String(row.timezone ?? "Europe/London"),
    mfaEnabled: Boolean(row.mfa_enabled),
  }),
};

export class UserRepository extends BaseRepository<User> {
  constructor(source: DataSource) {
    super(source, userConfig);
  }

  findByEmail(context: TenantContext, email: string) {
    return this.findOneBy(context, [
      { column: "email", op: "eq", value: email.trim().toLowerCase() },
    ]);
  }

  /** Batch resolution keeps member/participant lists free of N+1 reads. */
  async resolveMany(context: TenantContext, ids: string[]): Promise<Map<string, User>> {
    const users = await this.findByIds(context, ids);
    return new Map(users.map((user) => [user.id, user]));
  }
}

/* ------------------------------ Organisation ------------------------------ */

const organisationSchema: EntitySchema = {
  name: { type: "string", required: true, minLength: 2, maxLength: 200 },
  slug: { type: "string", required: true, minLength: 2, maxLength: 80, pattern: /^[a-z0-9-]+$/ },
  description: { type: "string", maxLength: 2000 },
  industry: { type: "string", maxLength: 120 },
  organisationSize: { type: "string", maxLength: 60 },
  country: { type: "string", maxLength: 80 },
  timezone: { type: "string", maxLength: 64 },
  website: { type: "string", maxLength: 2048 },
  logo: { type: "string", maxLength: 2048 },
  status: { type: "string", enum: ["active", "suspended", "archived"] },
  subscriptionPlan: { type: "string", maxLength: 60 },
};

export class OrganisationRepository extends BaseRepository<Organisation> {
  constructor(source: DataSource) {
    super(source, {
      entity: "organisation",
      table: "organisations",
      schema: organisationSchema,
      tenantScope: "none",
      toDomain: (row: Row): Organisation => ({
        ...baseEntityFrom(row),
        name: String(row.name ?? ""),
        slug: String(row.slug ?? ""),
        description: String(row.description ?? ""),
        industry: String(row.industry ?? ""),
        organisationSize: String(row.organisation_size ?? ""),
        country: String(row.country ?? ""),
        timezone: String(row.timezone ?? "Europe/London"),
        website: String(row.website ?? ""),
        logo: (row.logo as string) ?? null,
        status: String(row.status ?? "active"),
        subscriptionPlan: String(row.subscription_plan ?? "trial"),
      }),
    });
  }

  findBySlug(context: TenantContext, slug: string) {
    return this.findOneBy(context, [{ column: "slug", op: "eq", value: slug }]);
  }

  /** Organisations a user belongs to — one join, never a loop of reads. */
  async listForUser(context: TenantContext, userId: string): Promise<Organisation[]> {
    const { rows } = await this.source.find({
      table: "organisation_memberships",
      select: "organisation_id",
      filters: [
        { column: "user_id", op: "eq", value: userId },
        { column: "status", op: "eq", value: "active" },
      ],
    });
    const ids = rows.map((row) => String(row.organisation_id));
    return this.findByIds({ ...context, crossTenant: true }, ids);
  }
}

/* -------------------------------- Workspace ------------------------------- */

const workspaceSchema: EntitySchema = {
  organisationId: { type: "uuid", required: true },
  name: { type: "string", required: true, minLength: 2, maxLength: 200 },
  slug: { type: "string", required: true, maxLength: 80, pattern: /^[a-z0-9-]+$/ },
  description: { type: "string", maxLength: 2000 },
  type: { type: "string", maxLength: 60 },
  status: { type: "string", enum: ["active", "archived"] },
  colour: { type: "string", maxLength: 32 },
  icon: { type: "string", maxLength: 64 },
  visibility: { type: "string", maxLength: 32 },
  createdBy: { type: "uuid" },
};

export class WorkspaceRepository extends BaseRepository<Workspace> {
  constructor(source: DataSource) {
    super(source, {
      entity: "workspace",
      table: "workspaces",
      schema: workspaceSchema,
      tenantScope: "organisation",
      toDomain: (row: Row): Workspace => ({
        ...baseEntityFrom(row),
        organisationId: String(row.organisation_id),
        workspaceId: String(row.id),
        name: String(row.name ?? ""),
        slug: String(row.slug ?? ""),
        description: String(row.description ?? ""),
        type: String(row.type ?? "general"),
        status: String(row.status ?? "active"),
        colour: String(row.colour ?? ""),
        icon: String(row.icon ?? ""),
        visibility: String(row.visibility ?? "organisation"),
      }),
    });
  }

  listForOrganisation(context: TenantContext, options: QueryOptions = {}): Promise<Page<Workspace>> {
    return this.findMany(context, {
      ...options,
      sort: options.sort ?? [{ column: "name", direction: "asc" }],
    });
  }

  archive(context: TenantContext, id: string) {
    return this.update(context, id, { status: "archived" });
  }
}

/* ------------------------------- Memberships ------------------------------ */

export class OrganisationMembershipRepository extends BaseRepository<OrganisationMembership> {
  constructor(source: DataSource) {
    super(source, {
      entity: "membership",
      table: "organisation_memberships",
      schema: {
        organisationId: { type: "uuid", required: true },
        userId: { type: "uuid", required: true },
        role: { type: "string", required: true, maxLength: 60 },
        status: { type: "string", maxLength: 40 },
        invitedBy: { type: "uuid" },
        joinedAt: { type: "iso-date" },
      },
      tenantScope: "organisation",
      toDomain: (row: Row): OrganisationMembership => ({
        ...baseEntityFrom(row),
        organisationId: String(row.organisation_id),
        userId: String(row.user_id),
        role: String(row.role),
        status: String(row.status ?? "active"),
        joinedAt: String(row.joined_at ?? row.created_at),
        invitedBy: (row.invited_by as string) ?? null,
      }),
    });
  }

  findMembership(context: TenantContext, organisationId: string, userId: string) {
    return this.findOneBy({ ...context, organisationId }, [
      { column: "user_id", op: "eq", value: userId },
    ]);
  }
}

export class WorkspaceMembershipRepository extends BaseRepository<WorkspaceMembership> {
  constructor(source: DataSource) {
    super(source, {
      entity: "workspace membership",
      table: "workspace_memberships",
      schema: {
        workspaceId: { type: "uuid", required: true },
        userId: { type: "uuid", required: true },
        role: { type: "string", required: true, maxLength: 60 },
        status: { type: "string", maxLength: 40 },
        favourite: { type: "boolean" },
        joinedAt: { type: "iso-date" },
      },
      tenantScope: "none",
      toDomain: (row: Row): WorkspaceMembership => ({
        ...baseEntityFrom(row),
        workspaceId: String(row.workspace_id),
        userId: String(row.user_id),
        role: String(row.role),
        status: String(row.status ?? "active"),
        favourite: Boolean(row.favourite),
        joinedAt: String(row.joined_at ?? row.created_at),
      }),
    });
  }

  listForWorkspace(context: TenantContext, workspaceId: string) {
    return this.findMany(context, {
      filters: [{ column: "workspace_id", op: "eq", value: workspaceId }],
      pageSize: 200,
    });
  }
}

/* ----------------------------- Knowledge Packs ---------------------------- */

const knowledgePackSchema: EntitySchema = {
  packId: { type: "string", required: true, maxLength: 120 },
  packVersion: { type: "string", required: true, maxLength: 40 },
  organisationId: { type: "uuid" },
  workspaceId: { type: "uuid" },
  name: { type: "string", required: true, maxLength: 200 },
  description: { type: "string", maxLength: 4000 },
  category: { type: "string", maxLength: 80 },
  status: { type: "string", enum: ["draft", "published", "deprecated", "archived"] },
  source: { type: "string", maxLength: 60 },
  tags: { type: "array" },
  definition: { type: "json" },
  metadata: { type: "json" },
  publishedAt: { type: "iso-date" },
};

export class KnowledgePackRepository extends BaseRepository<KnowledgePack> {
  constructor(source: DataSource) {
    super(source, {
      entity: "knowledge pack",
      table: "knowledge_packs",
      schema: knowledgePackSchema,
      tenantScope: "none", // packs may be global (organisation_id null) or tenant-owned
      toDomain: (row: Row): KnowledgePack => ({
        ...baseEntityFrom(row),
        organisationId: (row.organisation_id as string) ?? null,
        workspaceId: (row.workspace_id as string) ?? null,
        packId: String(row.pack_id),
        packVersion: String(row.pack_version),
        name: String(row.name ?? ""),
        description: String(row.description ?? ""),
        category: String(row.category ?? "general"),
        status: (row.status as KnowledgePack["status"]) ?? "draft",
        source: String(row.source ?? "builtin"),
        tags: list(row.tags),
        definition: json(row.definition),
        metadata: json(row.metadata),
        publishedAt: (row.published_at as string) ?? null,
      }),
    });
  }

  /** Cached: pack metadata is read on every assessment launch and rarely changes. */
  listPublished(context: TenantContext, organisationId: string | null): Promise<KnowledgePack[]> {
    const key = `knowledge-packs:published:${organisationId ?? "global"}`;
    return cached(
      key,
      async () => {
        const { rows } = await this.source.find({
          table: this.config.table,
          filters: [
            { column: "is_deleted", op: "eq", value: false },
            { column: "status", op: "eq", value: "published" },
            ...(organisationId
              ? [{ column: "organisation_id", op: "in" as const, value: [organisationId, null] }]
              : []),
          ],
          sort: [{ column: "name", direction: "asc" }],
        });
        return rows.map(this.config.toDomain);
      },
      { ttlMs: CACHE_TTL.long, tags: [CacheTags.knowledgePacks] },
    ).then((packs) => {
      void context;
      return packs;
    });
  }

  async publish(context: TenantContext, id: string, expectedVersion?: number) {
    const pack = await this.update(
      context,
      id,
      { status: "published", publishedAt: new Date().toISOString() },
      { expectedVersion },
    );
    invalidateTag(CacheTags.knowledgePacks);
    invalidateTag(CacheTags.knowledgePack(pack.packId));
    return pack;
  }

  async categories(): Promise<string[]> {
    return cached(
      "knowledge-packs:categories",
      async () => {
        const { rows } = await this.source.find({
          table: this.config.table,
          select: "category",
          filters: [{ column: "is_deleted", op: "eq", value: false }],
        });
        return [...new Set(rows.map((row) => String(row.category)))].sort();
      },
      { ttlMs: CACHE_TTL.long, tags: [CacheTags.knowledgePacks, CacheTags.categories] },
    );
  }
}

/* ---------------------------- Assessment records --------------------------- */

export class AssessmentSessionRepository extends BaseRepository<AssessmentSessionRecord> {
  constructor(source: DataSource) {
    super(source, {
      entity: "assessment",
      table: "assessment_sessions",
      schema: {
        organisationId: { type: "uuid" },
        workspaceId: { type: "uuid" },
        ownerKey: { type: "string", required: true, maxLength: 200 },
        organisationName: { type: "string", required: true, maxLength: 200 },
        contactName: { type: "string", maxLength: 200 },
        assessmentType: { type: "string", required: true, maxLength: 120 },
        status: { type: "string", maxLength: 40 },
        currentSection: { type: "string", maxLength: 120 },
        progress: { type: "number", min: 0, max: 100 },
        metadata: { type: "json" },
        submittedAt: { type: "iso-date" },
        completedAt: { type: "iso-date" },
        archivedAt: { type: "iso-date" },
      },
      tenantScope: "workspace",
      toDomain: (row: Row): AssessmentSessionRecord => ({
        ...baseEntityFrom(row),
        organisationId: (row.organisation_id as string) ?? null,
        workspaceId: (row.workspace_id as string) ?? null,
        ownerKey: String(row.owner_key ?? ""),
        organisationName: String(row.organisation_name ?? ""),
        contactName: (row.contact_name as string) ?? null,
        assessmentType: String(row.assessment_type ?? ""),
        status: String(row.status ?? "draft"),
        currentSection: (row.current_section as string) ?? null,
        progress: Number(row.progress ?? 0),
        metadata: json(row.metadata),
        submittedAt: (row.submitted_at as string) ?? null,
        completedAt: (row.completed_at as string) ?? null,
        archivedAt: (row.archived_at as string) ?? null,
      }),
    });
  }

  history(context: TenantContext, options: QueryOptions = {}) {
    return this.findMany(context, {
      ...options,
      includeDeleted: true,
      sort: [{ column: "created_at", direction: "desc" }],
    });
  }

  archive(context: TenantContext, id: string, expectedVersion?: number) {
    return this.update(
      context,
      id,
      { status: "archived", archivedAt: new Date().toISOString() },
      { expectedVersion },
    );
  }
}

export class AssessmentResponseRepository extends BaseRepository<AssessmentResponseRecord> {
  constructor(source: DataSource) {
    super(source, {
      entity: "response",
      table: "assessment_responses",
      schema: {
        sessionId: { type: "uuid", required: true },
        sectionId: { type: "string", required: true, maxLength: 120 },
        questionId: { type: "string", required: true, maxLength: 120 },
        value: { type: "json" },
        score: { type: "number" },
        notes: { type: "string", maxLength: 4000 },
        answeredAt: { type: "iso-date" },
      },
      tenantScope: "none",
      toDomain: (row: Row): AssessmentResponseRecord => ({
        ...baseEntityFrom(row),
        sessionId: String(row.session_id),
        sectionId: String(row.section_id),
        questionId: String(row.question_id),
        value: row.value,
        score: row.score === null || row.score === undefined ? null : Number(row.score),
        notes: (row.notes as string) ?? null,
        answeredAt: String(row.answered_at ?? row.created_at),
      }),
    });
  }

  /** One query per session, never one per question. */
  listForSession(context: TenantContext, sessionId: string) {
    return this.findMany(context, {
      filters: [{ column: "session_id", op: "eq", value: sessionId }],
      pageSize: 200,
      sort: [{ column: "answered_at", direction: "asc" }],
    });
  }
}

/* ------------------------------ Notifications ----------------------------- */

export class NotificationRepository extends BaseRepository<Notification> {
  constructor(source: DataSource) {
    super(source, {
      entity: "notification",
      table: "platform_notifications",
      schema: {
        userId: { type: "uuid", required: true },
        organisationId: { type: "uuid" },
        workspaceId: { type: "uuid" },
        module: { type: "string", required: true, maxLength: 60 },
        eventType: { type: "string", required: true, maxLength: 120 },
        title: { type: "string", required: true, maxLength: 200 },
        body: { type: "string", maxLength: 2000 },
        severity: { type: "string", maxLength: 40 },
        readAt: { type: "iso-date" },
        metadata: { type: "json" },
      },
      tenantScope: "none",
      toDomain: (row: Row): Notification => ({
        ...baseEntityFrom(row),
        userId: String(row.user_id),
        organisationId: (row.organisation_id as string) ?? null,
        workspaceId: (row.workspace_id as string) ?? null,
        module: String(row.module ?? ""),
        eventType: String(row.event_type ?? ""),
        title: String(row.title ?? ""),
        body: String(row.body ?? ""),
        severity: String(row.severity ?? "info"),
        readAt: (row.read_at as string) ?? null,
        metadata: json(row.metadata),
      }),
    });
  }

  inbox(context: TenantContext, userId: string, options: QueryOptions = {}) {
    return this.findMany(context, {
      ...options,
      filters: [{ column: "user_id", op: "eq", value: userId }],
      sort: [{ column: "created_at", direction: "desc" }],
    });
  }

  async markRead(context: TenantContext, userId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const updated = await this.source.update(
      this.config.table,
      { read_at: new Date().toISOString(), updated_by: context.userId },
      [
        { column: "user_id", op: "eq", value: userId },
        { column: "id", op: "in", value: ids },
      ],
    );
    return updated.length;
  }
}

/* ---------------------------------- Audit --------------------------------- */

export class AuditRepository {
  constructor(private readonly source: DataSource) {}

  async record(event: Record<string, unknown>): Promise<void> {
    await this.source.insert("audit_events", [
      { created_at: new Date().toISOString(), timestamp: new Date().toISOString(), ...event },
    ]);
  }

  async query(
    context: TenantContext,
    filters: Filter[] = [],
    options: QueryOptions = {},
  ): Promise<{ rows: Row[]; total: number }> {
    if (!context.crossTenant && !context.organisationId) {
      filters = [...filters, { column: "organisation_id", op: "eq", value: "__denied__" }];
    } else if (!context.crossTenant) {
      filters = [
        ...filters,
        { column: "organisation_id", op: "eq", value: String(context.organisationId) },
      ];
    }
    return this.source.find({
      table: "audit_events",
      filters,
      sort: options.sort ?? [{ column: "created_at", direction: "desc" }],
      limit: options.pageSize ?? 50,
      offset: ((options.page ?? 1) - 1) * (options.pageSize ?? 50),
      count: true,
    });
  }

  /** Audit records are immutable: retention archives, it never rewrites. */
  async archiveOlderThan(cutoffIso: string): Promise<number> {
    const updated = await this.source.update(
      "audit_events",
      { archived_at: new Date().toISOString() },
      [
        { column: "created_at", op: "lt", value: cutoffIso },
        { column: "archived_at", op: "is", value: null },
      ],
    );
    return updated.length;
  }
}

/* --------------------------- Settings & retention -------------------------- */

export class PlatformSettingRepository extends BaseRepository<PlatformSetting> {
  constructor(source: DataSource) {
    super(source, {
      entity: "setting",
      table: "platform_settings",
      schema: {
        scope: { type: "string", required: true, enum: ["platform", "organisation", "workspace"] },
        scopeId: { type: "uuid" },
        key: { type: "string", required: true, maxLength: 120 },
        value: { type: "json" },
        description: { type: "string", maxLength: 1000 },
        organisationId: { type: "uuid" },
        workspaceId: { type: "uuid" },
      },
      tenantScope: "none",
      toDomain: (row: Row): PlatformSetting => ({
        ...baseEntityFrom(row),
        scope: (row.scope as PlatformSetting["scope"]) ?? "platform",
        scopeId: (row.scope_id as string) ?? null,
        key: String(row.key),
        value: row.value,
        description: String(row.description ?? ""),
        organisationId: (row.organisation_id as string) ?? null,
        workspaceId: (row.workspace_id as string) ?? null,
      }),
    });
  }

  /** Cached read-through: settings are read constantly and written rarely. */
  resolve(scope: PlatformSetting["scope"], scopeId: string | null): Promise<PlatformSetting[]> {
    const key = `settings:${scope}:${scopeId ?? "global"}`;
    const tag =
      scope === "organisation" && scopeId
        ? CacheTags.organisationSettings(scopeId)
        : scope === "workspace" && scopeId
          ? CacheTags.workspaceSettings(scopeId)
          : CacheTags.platformSettings;

    return cached(
      key,
      async () => {
        const { rows } = await this.source.find({
          table: this.config.table,
          filters: [
            { column: "is_deleted", op: "eq", value: false },
            { column: "scope", op: "eq", value: scope },
            { column: "scope_id", op: "is", value: scopeId },
          ],
        });
        return rows.map(this.config.toDomain);
      },
      { ttlMs: CACHE_TTL.medium, tags: [tag] },
    );
  }

  async put(
    context: TenantContext,
    setting: {
      scope: PlatformSetting["scope"];
      scopeId: string | null;
      key: string;
      value: unknown;
      organisationId?: string | null;
    },
  ): Promise<PlatformSetting> {
    const existing = await this.findOneBy(context, [
      { column: "scope", op: "eq", value: setting.scope },
      { column: "scope_id", op: "is", value: setting.scopeId },
      { column: "key", op: "eq", value: setting.key },
    ]);

    const saved = existing
      ? await this.update(context, existing.id, { value: setting.value })
      : await this.create(context, setting);

    invalidateTag(CacheTags.platformSettings);
    if (setting.organisationId) invalidateTag(CacheTags.organisationSettings(setting.organisationId));
    return saved;
  }
}

export class RetentionPolicyRepository extends BaseRepository<RetentionPolicy> {
  constructor(source: DataSource) {
    super(source, {
      entity: "retention policy",
      table: "platform_retention_policies",
      schema: {
        entity: { type: "string", required: true, maxLength: 80 },
        organisationId: { type: "uuid" },
        mode: { type: "string", enum: ["retain", "archive", "purge"] },
        retainDays: { type: "number", min: 1, max: 3650 },
        enabled: { type: "boolean" },
        description: { type: "string", maxLength: 1000 },
        lastAppliedAt: { type: "iso-date" },
      },
      tenantScope: "none",
      toDomain: (row: Row): RetentionPolicy => ({
        ...baseEntityFrom(row),
        entity: String(row.entity),
        organisationId: (row.organisation_id as string) ?? null,
        mode: (row.mode as RetentionPolicy["mode"]) ?? "retain",
        retainDays: row.retain_days === null || row.retain_days === undefined ? null : Number(row.retain_days),
        enabled: Boolean(row.enabled ?? true),
        description: String(row.description ?? ""),
        lastAppliedAt: (row.last_applied_at as string) ?? null,
      }),
    });
  }

  active(context: TenantContext) {
    return cached(
      "retention:active",
      async () => {
        const page = await this.findMany(context, {
          filters: [{ column: "enabled", op: "eq", value: true }],
          pageSize: 100,
        });
        return page.items;
      },
      { ttlMs: CACHE_TTL.medium, tags: [CacheTags.retention] },
    );
  }
}

/* ------------------------------ Repository set ----------------------------- */

export interface PlatformRepositories {
  users: UserRepository;
  organisations: OrganisationRepository;
  organisationMemberships: OrganisationMembershipRepository;
  workspaces: WorkspaceRepository;
  workspaceMemberships: WorkspaceMembershipRepository;
  knowledgePacks: KnowledgePackRepository;
  assessmentSessions: AssessmentSessionRepository;
  assessmentResponses: AssessmentResponseRepository;
  notifications: NotificationRepository;
  audit: AuditRepository;
  settings: PlatformSettingRepository;
  retention: RetentionPolicyRepository;
}

export function createRepositories(source: DataSource): PlatformRepositories {
  return {
    users: new UserRepository(source),
    organisations: new OrganisationRepository(source),
    organisationMemberships: new OrganisationMembershipRepository(source),
    workspaces: new WorkspaceRepository(source),
    workspaceMemberships: new WorkspaceMembershipRepository(source),
    knowledgePacks: new KnowledgePackRepository(source),
    assessmentSessions: new AssessmentSessionRepository(source),
    assessmentResponses: new AssessmentResponseRepository(source),
    notifications: new NotificationRepository(source),
    audit: new AuditRepository(source),
    settings: new PlatformSettingRepository(source),
    retention: new RetentionPolicyRepository(source),
  };
}
