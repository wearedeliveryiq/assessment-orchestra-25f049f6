# Platform Persistence Layer

Canonical data access for DeliveryIQ. No assessment or intelligence logic lives here.

## Layout

| File | Responsibility |
| --- | --- |
| `types.ts` | `BaseEntity`, `TenantContext`, `DataSource` contract, paging |
| `entities.ts` | Domain models, decoupled from table shape |
| `validation.ts` | Declarative schemas; runs before every write, blocks mass assignment |
| `errors.ts` | Stable error taxonomy (`not_found`, `duplicate`, `concurrency_conflict`, `tenant_violation`, …) |
| `repository.ts` | `BaseRepository`: tenancy, audit fields, soft delete, optimistic locking, batch loads |
| `repositories.ts` | One aggregate repository per entity + `createRepositories(dataSource)` |
| `unit-of-work.ts` | Multi-aggregate transactions with compensating actions |
| `transactions.server.ts` | Named platform flows (register user, create org/workspace, launch assessment, accept invitation) |
| `cache.ts` | Tagged TTL cache for slow-changing metadata |
| `retention.server.ts` | Applies configured retention policies |
| `data-source.server.ts` | PostgreSQL driver |
| `memory-data-source.ts` | In-memory driver for tests |
| `index.server.ts` | Production repository set |

## Rules

1. **Tenant context is server-derived.** Never take `organisationId` from request input. Tenant-scoped repositories append the filter themselves; a missing organisation raises `tenant_violation` instead of returning everything.
2. **Every entity carries** `id, createdAt, updatedAt, createdBy, updatedBy, version, isDeleted, deletedAt`.
3. **Updates are optimistic.** Pass `expectedVersion` from the row you read; a mismatch raises `concurrency_conflict`.
4. **Deletes are soft** unless the data is genuinely disposable. `restoreById` reverses them.
5. **Batch, don't loop.** Use `findByIds` / `resolveMany` to resolve related records.
6. **Cross-aggregate writes go through a Unit of Work** so partial failure leaves nothing behind.
7. **Cache metadata only** (packs, settings, retention) and invalidate by tag on write.

## Usage

```ts
import { repositories } from "@/lib/persistence/index.server";

const workspaces = await repositories.workspaces.listForOrganisation(context);
```

Tests build their own set:

```ts
const repos = createRepositories(new InMemoryDataSource());
```
