import { describe, expect, it, vi } from "vitest";

import {
  catalogueDigest,
  CatalogueValidationError,
  nextCatalogueState,
  sprint03CatalogueSnapshot,
  validateCatalogueSnapshot,
} from "@/lib/recommendation-catalogue/catalogue";
import {
  CatalogueServiceError,
  RecommendationCatalogueService,
  type CatalogueRepository,
} from "@/lib/recommendation-catalogue/service.server";
import type { CatalogueVersionRecord } from "@/lib/recommendation-catalogue/types";

const actor = "11111111-1111-4111-8111-111111111111";
const approver = "22222222-2222-4222-8222-222222222222";

function record(overrides: Partial<CatalogueVersionRecord> = {}): CatalogueVersionRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    catalogueId: "deliveryiq-recommendations",
    version: "1.0.0",
    sourceConfigurationSetId: "sprint03-product-config-1.0.0",
    contentDigest: "a".repeat(64),
    snapshot: sprint03CatalogueSnapshot(),
    state: "draft",
    authoredBy: actor,
    createdAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

function harness(overrides: Partial<CatalogueRepository> = {}) {
  const repo: CatalogueRepository = {
    createVersion: vi.fn(async (input) => record({ contentDigest: String(input.content_digest) })),
    getVersion: vi.fn(async () => record()),
    getActiveVersion: vi.fn(async () => record({ state: "active" })),
    findByIdentity: vi.fn(async () => null),
    listDefinitionsByStableId: vi.fn(async () => []),
    transition: vi.fn(async () => record({ state: "in_review" })),
    ...overrides,
  };
  return { service: new RecommendationCatalogueService(repo), repo };
}

describe("S4-001 recommendation catalogue governance", () => {
  it("builds the exact locked DIQ-203 catalogue without changing recommendation rules", () => {
    const snapshot = sprint03CatalogueSnapshot();
    expect(snapshot.definitions).toHaveLength(10);
    expect(snapshot.definitions.map((item) => item.id)).toContain("rec_decision_rights");
    expect(snapshot.sourceConfigurationSetId).toBe("sprint03-product-config-1.0.0");
  });

  it("produces a deterministic digest independent of object key order", async () => {
    const snapshot = sprint03CatalogueSnapshot();
    const reordered = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    reordered.definitions = reordered.definitions.map((item) => ({
      conflicts: item.conflicts,
      successMeasures: item.successMeasures,
      outcome: item.outcome,
      dependencies: item.dependencies,
      exclusions: item.exclusions,
      triggers: item.triggers,
      dedupeGroup: item.dedupeGroup,
      effort: item.effort,
      impact: item.impact,
      title: item.title,
      order: item.order,
      version: item.version,
      id: item.id,
    }));
    expect(await catalogueDigest(reordered)).toBe(await catalogueDigest(snapshot));
  });

  it.each([
    [
      "duplicate ID",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) =>
        value.definitions.push(value.definitions[0]),
    ],
    [
      "unknown dependency",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) =>
        value.definitions[0].dependencies.push("rec_unknown"),
    ],
    [
      "self reference",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) =>
        value.definitions[0].dependencies.push(value.definitions[0].id),
    ],
    [
      "dependency conflict",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) => {
        value.definitions[2].conflicts.push(value.definitions[2].dependencies[0]);
      },
    ],
    [
      "dependency cycle",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) => {
        value.definitions[0].dependencies.push(value.definitions[1].id);
        value.definitions[1].dependencies.push(value.definitions[0].id);
      },
    ],
    [
      "empty copy",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) => {
        value.definitions[0].title = "";
      },
    ],
    [
      "unknown trigger",
      (value: ReturnType<typeof sprint03CatalogueSnapshot>) => {
        value.definitions[0].triggers.any = [{ pattern: "pat_unknown" }];
      },
    ],
  ])("fails closed for %s", (_label, mutate) => {
    const snapshot = structuredClone(sprint03CatalogueSnapshot());
    mutate(snapshot);
    expect(() => validateCatalogueSnapshot(snapshot)).toThrow(CatalogueValidationError);
  });

  it("enforces the locked lifecycle and rollback transitions", () => {
    expect(nextCatalogueState("draft", "submit")).toBe("in_review");
    expect(nextCatalogueState("in_review", "approve")).toBe("approved");
    expect(nextCatalogueState("approved", "activate")).toBe("active");
    expect(nextCatalogueState("active", "retire")).toBe("retired");
    expect(nextCatalogueState("superseded", "rollback")).toBe("active");
    expect(() => nextCatalogueState("draft", "activate")).toThrow(CatalogueValidationError);
  });

  it("returns an identical version as an idempotent replay", async () => {
    const snapshot = sprint03CatalogueSnapshot();
    const digest = await catalogueDigest(snapshot);
    const existing = record({ contentDigest: digest });
    const { service, repo } = harness({ findByIdentity: vi.fn(async () => existing) });
    await expect(service.createDraft(snapshot, actor, "draft-1")).resolves.toEqual({
      version: existing,
      reused: true,
    });
    expect(repo.createVersion).not.toHaveBeenCalled();
  });

  it("rejects same catalogue version with different content", async () => {
    const { service } = harness({ findByIdentity: vi.fn(async () => record()) });
    await expect(
      service.createDraft(sprint03CatalogueSnapshot(), actor, "draft-1"),
    ).rejects.toMatchObject({
      code: "CATALOGUE_VERSION_INVALID",
      status: 409,
    });
  });

  it("enforces author/approver separation before repository transition", async () => {
    const { service, repo } = harness({
      getVersion: vi.fn(async () => record({ state: "in_review" })),
    });
    await expect(
      service.command(record().id, "approve", actor, "approve-1"),
    ).rejects.toBeInstanceOf(CatalogueServiceError);
    expect(repo.transition).not.toHaveBeenCalled();
    await expect(
      service.command(record().id, "approve", approver, "approve-2"),
    ).resolves.toMatchObject({
      state: "in_review",
    });
  });
});
