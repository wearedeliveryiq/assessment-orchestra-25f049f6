import { supabaseDataSource } from "./data-source.server";
import { createRepositories, type PlatformRepositories } from "./repositories";

/**
 * Production repository set, bound to the PostgreSQL driver.
 *
 * Domain services import from here; tests build their own set with the
 * in-memory driver via `createRepositories(new InMemoryDataSource())`.
 */
export const repositories: PlatformRepositories = createRepositories(supabaseDataSource);

export { supabaseDataSource };
export * from "./transactions.server";
