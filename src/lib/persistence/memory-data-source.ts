import { PersistenceError } from "./errors";
import type { DataSource, Filter, QuerySpec, Row } from "./types";

/**
 * In-memory driver used by the persistence test-suite and local tooling.
 * It implements the same contract as the PostgreSQL driver, including unique
 * constraint enforcement, so repository behaviour can be verified without a
 * live database.
 */

interface TableConfig {
  unique?: string[][];
  /** Columns that must reference an existing row in another table. */
  references?: { column: string; table: string }[];
}

function matches(row: Row, filter: Filter): boolean {
  const value = row[filter.column];
  switch (filter.op) {
    case "eq":
      return value === filter.value;
    case "neq":
      return value !== filter.value;
    case "gt":
      return (value as number) > (filter.value as number);
    case "gte":
      return (value as number) >= (filter.value as number);
    case "lt":
      return (value as number) < (filter.value as number);
    case "lte":
      return (value as number) <= (filter.value as number);
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value as never);
    case "is":
      return value === filter.value || (filter.value === null && value == null);
    case "like":
      return String(value).includes(String(filter.value).replace(/%/g, ""));
    case "ilike":
      return String(value).toLowerCase().includes(String(filter.value).replace(/%/g, "").toLowerCase());
    case "contains":
      return (
        Array.isArray(value) &&
        Array.isArray(filter.value) &&
        (filter.value as unknown[]).every((item) => value.includes(item))
      );
    default:
      return false;
  }
}

export class InMemoryDataSource implements DataSource {
  readonly tables = new Map<string, Row[]>();
  /** Counts reads so tests can assert batch loading avoids N+1 queries. */
  queryCount = 0;
  private readonly config = new Map<string, TableConfig>();

  configure(table: string, config: TableConfig): void {
    this.config.set(table, config);
    if (!this.tables.has(table)) this.tables.set(table, []);
  }

  rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  reset(): void {
    this.tables.clear();
  }

  /** Snapshot/restore powers the transaction rollback tests. */
  snapshot(): Map<string, Row[]> {
    return new Map([...this.tables].map(([table, rows]) => [table, rows.map((row) => ({ ...row }))]));
  }

  restore(snapshot: Map<string, Row[]>): void {
    this.tables.clear();
    for (const [table, rows] of snapshot) this.tables.set(table, rows.map((row) => ({ ...row })));
  }

  async find(spec: QuerySpec) {
    this.queryCount += 1;
    let rows = this.rows(spec.table).filter((row) => spec.filters.every((f) => matches(row, f)));

    for (const sort of [...(spec.sort ?? [])].reverse()) {
      rows = [...rows].sort((a, b) => {
        const left = a[sort.column] as never;
        const right = b[sort.column] as never;
        if (left === right) return 0;
        const order = left > right ? 1 : -1;
        return sort.direction === "desc" ? -order : order;
      });
    }

    const total = rows.length;
    const offset = spec.offset ?? 0;
    const limited = spec.limit === undefined ? rows : rows.slice(offset, offset + spec.limit);
    return { rows: limited.map((row) => ({ ...row })), total };
  }

  async insert(table: string, incoming: Row[]) {
    const config = this.config.get(table) ?? {};
    const rows = this.rows(table);
    // Mirrors the database default: identifiers are assigned by storage.
    incoming = incoming.map((row) => (row.id ? row : { ...row, id: crypto.randomUUID() }));

    for (const row of incoming) {
      for (const key of config.unique ?? []) {
        const clash = rows.some((existing) => key.every((column) => existing[column] === row[column]));
        if (clash) {
          throw new PersistenceError("duplicate", `That ${table} already exists.`, {
            detail: { code: "23505", key },
          });
        }
      }
      for (const reference of config.references ?? []) {
        const value = row[reference.column];
        if (value == null) continue;
        const exists = this.rows(reference.table).some((target) => target.id === value);
        if (!exists) {
          throw new PersistenceError(
            "missing_relationship",
            `A related record required by this ${table} does not exist.`,
            { detail: { code: "23503", column: reference.column } },
          );
        }
      }
    }

    rows.push(...incoming.map((row) => ({ ...row })));
    return incoming.map((row) => ({ ...row }));
  }

  async update(table: string, patch: Row, filters: Filter[]) {
    const updated: Row[] = [];
    for (const row of this.rows(table)) {
      if (!filters.every((filter) => matches(row, filter))) continue;
      Object.assign(row, patch);
      updated.push({ ...row });
    }
    return updated;
  }

  async remove(table: string, filters: Filter[]) {
    const rows = this.rows(table);
    const keep = rows.filter((row) => !filters.every((filter) => matches(row, filter)));
    const removed = rows.length - keep.length;
    this.tables.set(table, keep);
    return removed;
  }
}
