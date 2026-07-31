import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryDataSource } from "@/lib/persistence/memory-data-source";
import { createRepositories, type PlatformRepositories } from "@/lib/persistence/repositories";
import {
  createWorkspaceTransaction,
  registerUserTransaction,
  slugify,
} from "@/lib/persistence/transactions.server";
import { clearCache } from "@/lib/persistence/cache";
import type { TenantContext } from "@/lib/persistence/types";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "33333333-3333-4333-8333-333333333333";

function ctx(organisationId: string | null, overrides: Partial<TenantContext> = {}): TenantContext {
  return { userId: USER_A, organisationId, workspaceId: null, roles: [], ...overrides };
}

let source: InMemoryDataSource;
let repos: PlatformRepositories;

beforeEach(() => {
  clearCache();
  source = new InMemoryDataSource();
  repos = createRepositories(source);
});

describe("tenant isolation", () => {
  it("never returns another organisation's workspaces", async () => {
    await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
    });
    await repos.workspaces.create(ctx(ORG_B), {
      organisationId: ORG_B,
      name: "Beta",
      slug: "beta",
    });

    const pageA = await repos.workspaces.listForOrganisation(ctx(ORG_A));
    expect(pageA.items.map((w) => w.name)).toEqual(["Alpha"]);
  });

  it("refuses a tenant-scoped query without an organisation", async () => {
    await expect(repos.workspaces.findMany(ctx(null))).rejects.toMatchObject({
      code: "tenant_violation",
    });
  });

  it("refuses to read a foreign row by id", async () => {
    const workspace = await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
    });
    const found = await repos.workspaces.findById(ctx(ORG_B), workspace.id);
    expect(found).toBeNull();
  });
});

describe("audit fields and soft deletion", () => {
  it("stamps created_by and version on insert", async () => {
    const workspace = await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
    });
    expect(workspace.createdBy).toBe(USER_A);
    expect(workspace.version).toBe(1);
    expect(workspace.isDeleted).toBe(false);
  });

  it("hides soft-deleted rows but can restore them", async () => {
    const workspace = await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
    });
    await repos.workspaces.softDeleteById(ctx(ORG_A), workspace.id);

    expect(await repos.workspaces.findById(ctx(ORG_A), workspace.id)).toBeNull();
    const withDeleted = await repos.workspaces.findById(ctx(ORG_A), workspace.id, {
      includeDeleted: true,
    });
    expect(withDeleted?.isDeleted).toBe(true);

    const restored = await repos.workspaces.restoreById(ctx(ORG_A), workspace.id);
    expect(restored.isDeleted).toBe(false);
  });
});

describe("optimistic concurrency", () => {
  it("rejects a stale write and accepts the current version", async () => {
    const workspace = await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
    });

    const updated = await repos.workspaces.update(
      ctx(ORG_A),
      workspace.id,
      { name: "Alpha One" },
      { expectedVersion: workspace.version },
    );
    expect(updated.version).toBe(2);

    await expect(
      repos.workspaces.update(ctx(ORG_A), workspace.id, { name: "Stale" }, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "concurrency_conflict" });
  });
});

describe("validation", () => {
  it("rejects invalid field values before hitting storage", async () => {
    await expect(
      repos.workspaces.create(ctx(ORG_A), { organisationId: ORG_A, name: "A", slug: "Bad Slug" }),
    ).rejects.toMatchObject({ code: "validation_failed" });
  });

  it("ignores unknown fields instead of persisting them", async () => {
    const workspace = await repos.workspaces.create(ctx(ORG_A), {
      organisationId: ORG_A,
      name: "Alpha",
      slug: "alpha",
      isDeleted: true,
      version: 99,
    });
    expect(workspace.version).toBe(1);
    expect(workspace.isDeleted).toBe(false);
  });
});

describe("transactions", () => {
  it("creates organisation, membership and workspace atomically", async () => {
    const result = await registerUserTransaction(repos, ctx(null, { crossTenant: true }), {
      userId: USER_A,
      email: "owner@example.com",
      organisationName: "Northwind",
    });

    expect(result.organisation?.slug).toBe("northwind");
    expect(result.workspace?.name).toBe("General");

    const memberships = await repos.organisationMemberships.findMany(
      ctx(result.organisation!.id),
      {},
    );
    expect(memberships.items).toHaveLength(1);
  });

  it("compensates every completed step when a later step fails", async () => {
    const failing = createRepositories(source);
    failing.workspaceMemberships.create = async () => {
      throw new Error("boom");
    };

    await expect(
      createWorkspaceTransaction(failing, ctx(ORG_A), {
        organisationId: ORG_A,
        name: "Doomed",
        ownerId: USER_A,
      }),
    ).rejects.toThrow();

    const workspaces = await repos.workspaces.findMany(ctx(ORG_A), { includeDeleted: true });
    expect(workspaces.items).toHaveLength(0);
  });
});

describe("batch loading", () => {
  it("resolves many ids in a single query", async () => {
    const created = [];
    for (const name of ["A", "B", "C"]) {
      created.push(
        await repos.workspaces.create(ctx(ORG_A), {
          organisationId: ORG_A,
          name: `Team ${name}`,
          slug: `team-${name.toLowerCase()}`,
        }),
      );
    }
    const before = source.queryCount;
    const found = await repos.workspaces.findByIds(ctx(ORG_A), created.map((w) => w.id));
    expect(found).toHaveLength(3);
    expect(source.queryCount - before).toBe(1);
  });
});

describe("helpers", () => {
  it("slugifies names safely", () => {
    expect(slugify("Northwind Traders & Co.")).toBe("northwind-traders-co");
    expect(slugify("!!!")).toBe("workspace");
  });
});
