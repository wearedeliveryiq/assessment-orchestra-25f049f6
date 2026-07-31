/**
 * Platform persistence — core contracts.
 *
 * This layer is infrastructure only. It knows about storage, relationships,
 * tenancy, concurrency and versioning. It contains no business rules: those
 * live in the domain services under `src/lib/<domain>/*.server.ts`.
 */

/** Fields every persisted aggregate carries. Maintained automatically. */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
}

/** Tenant-owned aggregates additionally carry their owning scope. */
export interface TenantEntity extends BaseEntity {
  organisationId: string | null;
  workspaceId: string | null;
}

/**
 * Every repository call is executed inside a tenant context. The context is
 * derived server-side from the authenticated identity — never from request
 * input — and is applied as a mandatory filter on tenant-owned tables.
 */
export interface TenantContext {
  userId: string | null;
  organisationId?: string | null;
  workspaceId?: string | null;
  /** Platform-admin / system jobs may opt out of the organisation filter. */
  crossTenant?: boolean;
}

export const SYSTEM_CONTEXT: TenantContext = {
  userId: null,
  crossTenant: true,
};

/* ------------------------------- query model ------------------------------ */

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "is"
  | "like"
  | "ilike"
  | "contains";

export interface Filter {
  column: string;
  op: FilterOperator;
  value: unknown;
}

export interface SortSpec {
  column: string;
  direction?: "asc" | "desc";
}

export interface QuerySpec {
  table: string;
  filters: Filter[];
  /** Projection — column list, optionally with embedded relations. */
  select?: string;
  sort?: SortSpec[];
  limit?: number;
  offset?: number;
  count?: boolean;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortSpec[];
  filters?: Filter[];
  /** Column projection (defaults to `*`). Relations are joined, never N+1'd. */
  select?: string;
  includeDeleted?: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;

export function emptyPage<T>(page = 1, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  return { items: [], total: 0, page, pageSize, pageCount: 0 };
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

/** Normalises untrusted pagination input into a safe range. */
export function normalisePaging(options: QueryOptions = {}): { page: number; pageSize: number } {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const requested = Math.floor(Number(options.pageSize) || DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page, pageSize };
}

export type Row = Record<string, unknown>;

/**
 * Storage driver contract. `SupabaseDataSource` is the production
 * implementation; tests swap in an in-memory driver. Repositories never talk
 * to a database client directly, which is what keeps the layer
 * database-agnostic.
 */
export interface DataSource {
  find(spec: QuerySpec): Promise<{ rows: Row[]; total: number }>;
  insert(table: string, rows: Row[]): Promise<Row[]>;
  update(table: string, patch: Row, filters: Filter[]): Promise<Row[]>;
  remove(table: string, filters: Filter[]): Promise<number>;
}
