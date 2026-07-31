import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { failStorage } from "./errors";
import type { DataSource, Filter, QuerySpec, Row } from "./types";

/**
 * PostgreSQL driver.
 *
 * All statements are built through the parameterised PostgREST query builder —
 * user input is never string-concatenated into SQL, which removes injection as
 * a class of bug. Connection pooling is provided by the managed Postgres
 * pooler; the driver itself is stateless and safe on serverless workers.
 */

type AnyBuilder = any;

const db = () => supabaseAdmin as unknown as AnyBuilder;

function applyFilters(builder: AnyBuilder, filters: Filter[]): AnyBuilder {
  let query = builder;
  for (const filter of filters) {
    switch (filter.op) {
      case "in":
        query = query.in(filter.column, (filter.value as unknown[]) ?? []);
        break;
      case "is":
        query = query.is(filter.column, filter.value as never);
        break;
      case "contains":
        query = query.contains(filter.column, filter.value as never);
        break;
      case "like":
        query = query.like(filter.column, String(filter.value));
        break;
      case "ilike":
        query = query.ilike(filter.column, String(filter.value));
        break;
      default:
        query = query[filter.op](filter.column, filter.value as never);
    }
  }
  return query;
}

export const supabaseDataSource: DataSource = {
  async find(spec: QuerySpec) {
    let query = db()
      .from(spec.table)
      .select(spec.select ?? "*", { count: spec.count ? "exact" : undefined });

    query = applyFilters(query, spec.filters);

    for (const sort of spec.sort ?? []) {
      query = query.order(sort.column, { ascending: sort.direction !== "desc" });
    }

    if (spec.limit !== undefined) {
      const from = spec.offset ?? 0;
      query = query.range(from, from + spec.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) failStorage(spec.table, "find", error);
    const rows = (data ?? []) as Row[];
    return { rows, total: count ?? rows.length };
  },

  async insert(table: string, rows: Row[]) {
    const { data, error } = await db().from(table).insert(rows).select("*");
    if (error) failStorage(table, "insert", error);
    return (data ?? []) as Row[];
  },

  async update(table: string, patch: Row, filters: Filter[]) {
    const { data, error } = await applyFilters(db().from(table).update(patch), filters).select("*");
    if (error) failStorage(table, "update", error);
    return (data ?? []) as Row[];
  },

  async remove(table: string, filters: Filter[]) {
    const { data, error } = await applyFilters(db().from(table).delete(), filters).select("id");
    if (error) failStorage(table, "delete", error);
    return (data ?? []).length;
  },
};
