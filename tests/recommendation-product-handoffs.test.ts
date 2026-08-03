import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sprint03Configuration } from "@/lib/delivery-intelligence/config";
import {
  resolveProductHandoffOpportunities,
  type ProductOperationalState,
} from "@/lib/recommendation-handoffs/model";
import { projectProductHandoff } from "@/lib/recommendation-handoffs/projection";
import { ProductHandoffService } from "@/lib/recommendation-handoffs/service.server";
import type {
  ProductHandoffRecord,
  ProductHandoffRepository,
  ProductHandoffSource,
} from "@/lib/recommendation-handoffs/types";

const tenant = {
  organisationId: "22222222-2222-4222-8222-222222222222",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};
const actorUserId = "88888888-8888-4888-8888-888888888888";
const source: ProductHandoffSource = {
  actionId: "11111111-1111-4111-8111-111111111111",
  portfolioItemId: "44444444-4444-4444-8444-444444444444",
  analysisRunId: "55555555-5555-4555-8555-555555555555",
  recommendationId: "rec_decision_rights",
  recommendationVersion: "1.0.0",
  actionStatus: "in_progress",
  decisionState: "accepted",
  ...tenant,
};

function product(
  targetType: "knowledge_pack" | "teammate",
  targetId: string,
  overrides: Partial<ProductOperationalState> = {},
): ProductOperationalState {
  return {
    targetType,
    targetId,
    targetVersion: "1.0.0",
    status: "active",
    entitled: true,
    activated: false,
    ...overrides,
  };
}

function handoff(overrides: Partial<ProductHandoffRecord> = {}): ProductHandoffRecord {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    sourceActionId: source.actionId,
    sourcePortfolioItemId: source.portfolioItemId,
    analysisRunId: source.analysisRunId,
    recommendationId: source.recommendationId,
    recommendationVersion: source.recommendationVersion,
    ...tenant,
    targetType: "knowledge_pack",
    targetId: "governance",
    targetVersion: "1.0.0",
    cta: "start_assessment",
    consentBasis: "explicit_handoff_request",
    consentedAt: "2026-08-03T10:00:00.000Z",
    createdByUserId: actorUserId,
    expiresAt: "2099-08-03T10:10:00.000Z",
    createdAt: "2026-08-03T10:00:00.000Z",
    consumedAt: null,
    ...overrides,
  };
}

function repository(overrides: Partial<ProductHandoffRepository> = {}) {
  return {
    getSource: vi.fn().mockResolvedValue(source),
    getOperationalStates: vi.fn().mockResolvedValue([product("knowledge_pack", "governance")]),
    getHandoffByIdempotency: vi.fn().mockResolvedValue(null),
    getHandoffByTokenHash: vi.fn().mockResolvedValue(handoff()),
    createHandoff: vi.fn().mockResolvedValue(handoff()),
    consumeHandoff: vi.fn().mockResolvedValue(handoff({ consumedAt: new Date().toISOString() })),
    ...overrides,
  } satisfies ProductHandoffRepository;
}

const createInput = {
  actionId: source.actionId,
  ...tenant,
  actorUserId,
  permissions: ["assessment:read", "assessment:create"],
  targetType: "knowledge_pack" as const,
  targetId: "governance",
  targetVersion: "1.0.0",
  cta: "start_assessment" as const,
  consentAcknowledged: true,
  idempotencyKey: "product-handoff-create-0001",
};

beforeEach(() => vi.stubEnv("HANDOFF_TOKEN_SECRET", "test-only-product-handoff-secret"));
afterEach(() => vi.unstubAllEnvs());

describe("S4-011 locked Pack and TeamMate opportunity rules", () => {
  it("uses the exact DIQ-203A mapping catalogue for every recommendation", () => {
    const allProducts = [
      ...sprint03Configuration.knowledgePacks.map((pack) => product("knowledge_pack", pack.id)),
      ...sprint03Configuration.teamMates.map((teamMate) => product("teammate", teamMate.id)),
    ];
    for (const recommendation of sprint03Configuration.recommendations) {
      const opportunities = resolveProductHandoffOpportunities({
        recommendationId: recommendation.id,
        recommendationAccepted: true,
        permissions: ["assessment:create", "teammate.activate"],
        products: allProducts,
      });
      expect(
        opportunities
          .filter((candidate) => candidate.targetType === "knowledge_pack")
          .map((candidate) => candidate.targetId),
      ).toEqual(
        sprint03Configuration.knowledgePacks
          .filter((pack) => pack.mapsFromRecommendations.includes(recommendation.id))
          .map((pack) => pack.id),
      );
      expect(
        opportunities
          .filter((candidate) => candidate.targetType === "teammate")
          .map((candidate) => candidate.targetId),
      ).toEqual(
        sprint03Configuration.teamMates
          .filter((teamMate) => teamMate.mapsFromRecommendations.includes(recommendation.id))
          .map((teamMate) => teamMate.id),
      );
    }
  });

  it("separates Pack eligibility, availability, entitlement, permission and activation", () => {
    const entitled = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: true,
      permissions: ["assessment:create"],
      products: [product("knowledge_pack", "governance")],
    });
    expect(entitled[0]).toMatchObject({
      domainEligible: true,
      available: true,
      entitled: true,
      permitted: true,
      activated: false,
      cta: "start_assessment",
    });
    const unentitled = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: true,
      permissions: [],
      products: [product("knowledge_pack", "governance", { entitled: false })],
    });
    expect(unentitled[0]).toMatchObject({ entitled: false, permitted: true, cta: "view_pack" });
    const permissionRevoked = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: true,
      permissions: [],
      products: [product("knowledge_pack", "governance")],
    });
    expect(permissionRevoked[0]).toMatchObject({ permitted: false, cta: null });
    const activated = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: true,
      permissions: ["assessment:create"],
      products: [product("knowledge_pack", "governance", { activated: true })],
    });
    expect(activated[0]).toMatchObject({ activated: true, cta: null });
    expect(
      resolveProductHandoffOpportunities({
        recommendationId: source.recommendationId,
        recommendationAccepted: true,
        permissions: ["assessment:create"],
        products: [product("knowledge_pack", "governance", { status: "inactive" })],
      }),
    ).toEqual([]);
  });

  it("requires an accepted recommendation, entitlement and activate permission for TeamMate review", () => {
    expect(
      resolveProductHandoffOpportunities({
        recommendationId: source.recommendationId,
        recommendationAccepted: true,
        permissions: ["teammate.activate"],
        products: [product("teammate", "executive")],
      })[0],
    ).toMatchObject({ cta: "review_activation", entitled: true, permitted: true });
    expect(
      resolveProductHandoffOpportunities({
        recommendationId: source.recommendationId,
        recommendationAccepted: true,
        permissions: [],
        products: [product("teammate", "executive")],
      })[0],
    ).toMatchObject({ cta: null, entitled: true, permitted: false });
    expect(
      resolveProductHandoffOpportunities({
        recommendationId: source.recommendationId,
        recommendationAccepted: true,
        permissions: [],
        products: [product("teammate", "executive", { entitled: false })],
      })[0],
    ).toMatchObject({ cta: "view_teammate", entitled: false, permitted: true });
    expect(
      resolveProductHandoffOpportunities({
        recommendationId: source.recommendationId,
        recommendationAccepted: false,
        permissions: ["teammate.activate"],
        products: [product("teammate", "executive")],
      }),
    ).toEqual([]);
  });

  it("resolves 5,000 governed opportunity sets within the two-second portfolio target", () => {
    const started = performance.now();
    for (let index = 0; index < 5_000; index += 1) {
      resolveProductHandoffOpportunities({
        recommendationId: "rec_decision_rights",
        recommendationAccepted: true,
        permissions: ["assessment:create", "teammate.activate"],
        products: [product("knowledge_pack", "governance"), product("teammate", "executive")],
      });
    }
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("S4-011 hand-off service, expiry, replay and isolation", () => {
  it("requires explicit consent before any record is written", async () => {
    const repo = repository();
    await expect(
      new ProductHandoffService(repo).create({ ...createInput, consentAcknowledged: false }),
    ).rejects.toMatchObject({ code: "PRODUCT_HANDOFF_INVALID", status: 400 });
    expect(repo.createHandoff).not.toHaveBeenCalled();
  });

  it("creates a short-lived single-purpose hand-off without activating a product", async () => {
    const repo = repository();
    const result = await new ProductHandoffService(repo).create(createInput);
    expect(result.token).toMatch(/^diq_handoff_[A-Za-z0-9_-]{40,}$/);
    expect(repo.createHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        source_action_id: source.actionId,
        target_type: "knowledge_pack",
        target_id: "governance",
        target_version: "1.0.0",
        consent_basis: "explicit_handoff_request",
      }),
    );
    expect(Object.keys(repo)).not.toContain("activateProduct");
  });

  it("returns an exact stable replay and never writes a duplicate", async () => {
    let requestHash = "";
    const record = handoff();
    const repo = repository({
      getHandoffByIdempotency: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockImplementation(async () => ({ ...record, requestHash })),
      createHandoff: vi.fn().mockImplementation(async (input: Record<string, unknown>) => {
        requestHash = String(input.request_hash);
        return record;
      }),
    });
    const service = new ProductHandoffService(repo);
    const first = await service.create(createInput);
    const replay = await service.create(createInput);
    expect(replay).toEqual(first);
    expect(repo.createHandoff).toHaveBeenCalledTimes(1);
  });

  it("fails closed for a cross-tenant source", async () => {
    const repo = repository({ getSource: vi.fn().mockResolvedValue(null) });
    await expect(new ProductHandoffService(repo).create(createInput)).rejects.toMatchObject({
      code: "PRODUCT_HANDOFF_NOT_AVAILABLE",
      status: 404,
    });
    expect(repo.createHandoff).not.toHaveBeenCalled();
  });

  it("rejects an expired token before downstream consumption", async () => {
    const repo = repository({
      getHandoffByTokenHash: vi
        .fn()
        .mockResolvedValue(handoff({ expiresAt: "2026-08-03T10:01:00.000Z" })),
    });
    await expect(
      new ProductHandoffService(repo).consume({
        token: `diq_handoff_${"a".repeat(43)}`,
        ...tenant,
        actorUserId,
        permissions: ["assessment:create"],
      }),
    ).rejects.toMatchObject({ code: "PRODUCT_HANDOFF_EXPIRED", status: 410 });
    expect(repo.consumeHandoff).not.toHaveBeenCalled();
  });

  it("rechecks a target version retirement and revoked permission", async () => {
    const retiredRepo = repository({
      getOperationalStates: vi
        .fn()
        .mockResolvedValue([product("knowledge_pack", "governance", { targetVersion: "2.0.0" })]),
    });
    await expect(
      new ProductHandoffService(retiredRepo).consume({
        token: `diq_handoff_${"b".repeat(43)}`,
        ...tenant,
        actorUserId,
        permissions: ["assessment:create"],
      }),
    ).rejects.toMatchObject({ code: "PRODUCT_HANDOFF_NOT_AVAILABLE" });
    const teammate = handoff({
      targetType: "teammate",
      targetId: "executive",
      cta: "review_activation",
    });
    const revokedRepo = repository({
      getHandoffByTokenHash: vi.fn().mockResolvedValue(teammate),
      getOperationalStates: vi.fn().mockResolvedValue([product("teammate", "executive")]),
    });
    await expect(
      new ProductHandoffService(revokedRepo).consume({
        token: `diq_handoff_${"c".repeat(43)}`,
        ...tenant,
        actorUserId,
        permissions: [],
      }),
    ).rejects.toMatchObject({ code: "PRODUCT_HANDOFF_NOT_AVAILABLE" });
    expect(revokedRepo.consumeHandoff).not.toHaveBeenCalled();
  });

  it("consumes idempotently through the bounded repository contract without activation", async () => {
    const repo = repository();
    await expect(
      new ProductHandoffService(repo).consume({
        token: `diq_handoff_${"d".repeat(43)}`,
        ...tenant,
        actorUserId,
        permissions: ["assessment:create"],
      }),
    ).resolves.toMatchObject({ targetId: "governance", consumedAt: expect.any(String) });
    expect(repo.consumeHandoff).toHaveBeenCalledTimes(1);
    expect(Object.keys(repo)).not.toContain("activateProduct");
  });

  it("keeps tokens, tenant identifiers and actor identity out of customer projection and URLs", () => {
    const projection = projectProductHandoff(handoff());
    expect(projection).not.toHaveProperty("organisationId");
    expect(projection).not.toHaveProperty("workspaceId");
    expect(projection).not.toHaveProperty("createdByUserId");
    expect(projection).not.toHaveProperty("tokenHash");
    const client = readFileSync(
      new URL("../src/lib/recommendation-handoffs/client.ts", import.meta.url),
      "utf8",
    );
    expect(client).toContain("JSON.stringify({ token: created.token })");
    expect(client).not.toContain("?token=");
  });

  it("ships an accessible explicit-consent experience with non-activation copy", () => {
    const component = readFileSync(
      new URL("../src/components/dashboard/recommendation-handoff-controls.tsx", import.meta.url),
      "utf8",
    );
    expect(component).toContain('role="group"');
    expect(component).toContain('role="status"');
    expect(component).toContain('role="alert"');
    expect(component).toContain("Confirm secure hand-off");
    expect(component).toContain("does not activate a Knowledge Pack or TeamMate");
    expect(component).toContain("min-h-11");
  });
});
