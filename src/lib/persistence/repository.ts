import { PersistenceErrors, failStorage } from "./errors";
import type {
  BaseEntity,
  DataSource,
  Filter,
  Page,
  QueryOptions,
  Row,
  SortSpec,
  TenantContext,
} from "./types";
import { normalisePaging, paginate } from "./types";
import { assertValid, camel, isUuid, requireUuid, toColumns, type EntitySchema } from "./validation";

/**
 * BaseRepository — the single implementation of every cross-cutting
 * persistence concern:
 *
 *   • mandatory tenant filtering (cross-tenant reads are impossible)
 *   • soft deletion (business records are never hard-deleted by default)
 *   • automatic audit fields (createdBy/updatedBy/timestamps)
 *   • optimistic concurrency via `version`
 *   • pagination, sorting, filtering, projection and batch loading
 *
 * Aggregate repositories subclass it and add domain-focused methods. They
 * return domain models — no storage row ever escapes this layer.
 */

export type TenantScope = "none" | "organisation" | "workspace";

export interface RepositoryConfig<TDomain> {
  entity: string;
  table: string;
  schema: EntitySchema;
  tenantScope?: TenantScope;
  softDelete?: boolean;
  defaultSort?: SortSpec[];
  /** Column projection used by list/read queries; `*` when omitted. */
  select?: string;
  toDomain: (row: Row) => TDomain;
}

export const AUDIT_COLUMNS = [
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "version",
  "is_deleted",
  "deleted_at",
  "deleted_by",
] as const;

export function baseEntityFrom(row: Row): BaseEntity {
  return {
    id: String(row.id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
    version: Number(row.version ?? 1),
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: (row.deleted_at as string) ?? null,
    deletedBy: (row.deleted_by as string) ?? null,
  };
}

export interface UpdateOptions {
  /** Version the caller last read. Mismatch ⇒ concurrency conflict. */
  expectedVersion?: number;
}

export class BaseRepository<TDomain extends { id: string; version?: number }> {
  constructor(
    protected readonly source: DataSource,
    protected readonly config: RepositoryConfig<TDomain>,
  ) {}

  protected get softDelete(): boolean {
    return this.config.softDelete !== false;
  }

  /* ------------------------------ tenant guard ----------------------------- */

  /**
   * Builds the mandatory filter set for a query. Tenant columns are appended
   * from the *server-derived* context, never from caller input, so no filter
   * combination can reach another organisation's rows.
   */
  protected scopeFilters(context: TenantContext, options: QueryOptions = {}): Filter[] {
    const filters: Filter[] = [];
    const scope = this.config.tenantScope ?? "none";

    if (scope !== "none" && !context.crossTenant) {
      const organisationId = context.organisationId;
      if (!isUuid(organisationId)) throw PersistenceErrors.tenant();
      filters.push({ column: "organisation_id", op: "eq", value: organisationId });

      if (scope === "workspace" && context.workspaceId) {
        filters.push({ column: "workspace_id", op: "eq", value: context.workspaceId });
      }
    }

    if (this.softDelete && !options.includeDeleted) {
      filters.push({ column: "is_deleted", op: "eq", value: false });
    }

    return [...filters, ...(options.filters ?? [])];
  }

  /** Throws unless the row belongs to the caller's tenant. */
  protected assertTenant(context: TenantContext, row: Row): void {
    const scope = this.config.tenantScope ?? "none";
    if (scope === "none" || context.crossTenant) return;
    if (row.organisation_id && row.organisation_id !== context.organisationId) {
      throw PersistenceErrors.tenant();
    }
  }

  /* --------------------------------- reads --------------------------------- */

  async findById(
    context: TenantContext,
    id: string,
    options: QueryOptions = {},
  ): Promise<TDomain | null> {
    requireUuid(id, `${this.config.entity} id`);
    const { rows } = await this.source.find({
      table: this.config.table,
      select: options.select ?? this.config.select,
      filters: [...this.scopeFilters(context, options), { column: "id", op: "eq", value: id }],
      limit: 1,
    });
    if (rows.length === 0) return null;
    this.assertTenant(context, rows[0]);
    return this.config.toDomain(rows[0]);
  }

  async getById(context: TenantContext, id: string, options: QueryOptions = {}): Promise<TDomain> {
    const found = await this.findById(context, id, options);
    if (!found) throw PersistenceErrors.notFound(this.config.entity);
    return found;
  }

  /** Batch loader — the standard defence against N+1 access patterns. */
  async findByIds(context: TenantContext, ids: string[], options: QueryOptions = {}): Promise<TDomain[]> {
    const unique = [...new Set(ids.filter(isUuid))];
    if (unique.length === 0) return [];
    const { rows } = await this.source.find({
      table: this.config.table,
      select: options.select ?? this.config.select,
      filters: [...this.scopeFilters(context, options), { column: "id", op: "in", value: unique }],
    });
    return rows.map(this.config.toDomain);
  }

  async findOneBy(
    context: TenantContext,
    filters: Filter[],
    options: QueryOptions = {},
  ): Promise<TDomain | null> {
    const { rows } = await this.source.find({
      table: this.config.table,
      select: options.select ?? this.config.select,
      filters: [...this.scopeFilters(context, options), ...filters],
      limit: 1,
    });
    return rows.length ? this.config.toDomain(rows[0]) : null;
  }

  async findMany(context: TenantContext, options: QueryOptions = {}): Promise<Page<TDomain>> {
    const { page, pageSize } = normalisePaging(options);
    const { rows, total } = await this.source.find({
      table: this.config.table,
      select: options.select ?? this.config.select,
      filters: this.scopeFilters(context, options),
      sort: options.sort ?? this.config.defaultSort ?? [{ column: "created_at", direction: "desc" }],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      count: true,
    });
    return paginate(rows.map(this.config.toDomain), total, page, pageSize);
  }

  async count(context: TenantContext, options: QueryOptions = {}): Promise<number> {
    const { total } = await this.source.find({
      table: this.config.table,
      select: "id",
      filters: this.scopeFilters(context, options),
      count: true,
    });
    return total;
  }

  async exists(context: TenantContext, filters: Filter[]): Promise<boolean> {
    return (await this.findOneBy(context, filters)) !== null;
  }

  /* -------------------------------- writes --------------------------------- */

  async create(context: TenantContext, input: Record<string, unknown>): Promise<TDomain> {
    assertValid(this.config.entity, this.config.schema, input, "create");
    const now = new Date().toISOString();
    const scope = this.config.tenantScope ?? "none";

    const row: Row = {
      ...toColumns(this.config.schema, input),
      created_at: now,
      updated_at: now,
      created_by: context.userId,
      updated_by: context.userId,
      version: 1,
      is_deleted: false,
    };

    if (scope !== "none") {
      row.organisation_id = row.organisation_id ?? context.organisationId ?? null;
      if (scope === "workspace") row.workspace_id = row.workspace_id ?? context.workspaceId ?? null;
      if (!context.crossTenant && !row.organisation_id) throw PersistenceErrors.tenant();
      if (!context.crossTenant && context.organisationId && row.organisation_id !== context.organisationId) {
        throw PersistenceErrors.tenant();
      }
    }

    try {
      const [created] = await this.source.insert(this.config.table, [row]);
      return this.config.toDomain(created);
    } catch (error) {
      failStorage(this.config.entity, "create", error);
    }
  }

  /**
   * Optimistic update. When `expectedVersion` is supplied the write only
   * applies to a row still at that version; otherwise a conflict is raised.
   */
  async update(
    context: TenantContext,
    id: string,
    patch: Record<string, unknown>,
    options: UpdateOptions = {},
  ): Promise<TDomain> {
    requireUuid(id, `${this.config.entity} id`);
    assertValid(this.config.entity, this.config.schema, patch, "update");

    const current = await this.findById(context, id, { includeDeleted: true });
    if (!current) throw PersistenceErrors.notFound(this.config.entity);

    const currentVersion = Number(current.version ?? 1);
    if (options.expectedVersion !== undefined && options.expectedVersion !== currentVersion) {
      throw PersistenceErrors.concurrency(this.config.entity, options.expectedVersion, currentVersion);
    }

    const row: Row = {
      ...toColumns(this.config.schema, patch),
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
      version: currentVersion + 1,
    };

    try {
      const updated = await this.source.update(this.config.table, row, [
        ...this.scopeFilters(context, { includeDeleted: true }),
        { column: "id", op: "eq", value: id },
        { column: "version", op: "eq", value: currentVersion },
      ]);

      if (updated.length === 0) {
        // Someone committed between our read and our write.
        throw PersistenceErrors.concurrency(this.config.entity, currentVersion, currentVersion + 1);
      }
      return this.config.toDomain(updated[0]);
    } catch (error) {
      failStorage(this.config.entity, "update", error);
    }
  }

  async softDeleteById(context: TenantContext, id: string): Promise<TDomain> {
    if (!this.softDelete) throw PersistenceErrors.validation("This record cannot be deleted.");
    const current = await this.getById(context, id);
    const now = new Date().toISOString();
    const updated = await this.source.update(
      this.config.table,
      {
        is_deleted: true,
        deleted_at: now,
        deleted_by: context.userId,
        updated_at: now,
        updated_by: context.userId,
        version: Number(current.version ?? 1) + 1,
      },
      [...this.scopeFilters(context), { column: "id", op: "eq", value: id }],
    );
    if (updated.length === 0) throw PersistenceErrors.notFound(this.config.entity);
    return this.config.toDomain(updated[0]);
  }

  async restoreById(context: TenantContext, id: string): Promise<TDomain> {
    const current = await this.findById(context, id, { includeDeleted: true });
    if (!current) throw PersistenceErrors.notFound(this.config.entity);
    const now = new Date().toISOString();
    const updated = await this.source.update(
      this.config.table,
      {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
        updated_by: context.userId,
        version: Number(current.version ?? 1) + 1,
      },
      [
        ...this.scopeFilters(context, { includeDeleted: true }),
        { column: "id", op: "eq", value: id },
      ],
    );
    return this.config.toDomain(updated[0]);
  }

  /**
   * Permanent removal. Reserved for retention jobs and non-business data;
   * feature code should call `softDeleteById`.
   */
  async hardDeleteById(context: TenantContext, id: string): Promise<number> {
    requireUuid(id, `${this.config.entity} id`);
    return this.source.remove(this.config.table, [
      ...this.scopeFilters(context, { includeDeleted: true }),
      { column: "id", op: "eq", value: id },
    ]);
  }

  /** Compensating delete used by the Unit of Work when a step must unwind. */
  compensateCreate(context: TenantContext, id: string): () => Promise<void> {
    return async () => {
      await this.source.remove(this.config.table, [{ column: "id", op: "eq", value: id }]);
      void context;
    };
  }

  /** Maps a storage row to a plain object with camelCase keys. */
  protected static camelRow(row: Row): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) output[camel(key)] = value;
    return output;
  }
}
