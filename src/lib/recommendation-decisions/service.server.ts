import { semanticHash } from "../recommendation-evaluation/evaluator";
import {
  normalizeRecommendationDecisionFields,
  RecommendationDecisionError,
  transitionRecommendationDecision,
  type RecommendationDecisionCommand,
  type RecommendationDecisionReasonCategory,
} from "./model";
import * as repository from "./repository.server";
import type { RecommendationDecisionPortfolioItem, RecommendationDecisionRecord } from "./types";

export class RecommendationDecisionServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationDecisionRepository {
  getPortfolioItem(
    portfolioItemId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationDecisionPortfolioItem | null>;
  getPortfolioItems(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationDecisionPortfolioItem[] | null>;
  getDecision(
    source: RecommendationDecisionPortfolioItem,
    includeHistory?: boolean,
  ): Promise<RecommendationDecisionRecord>;
  getDecisionsForItems(
    sources: RecommendationDecisionPortfolioItem[],
    includeHistory?: boolean,
  ): Promise<RecommendationDecisionRecord[]>;
  getDecisionEventByIdempotency(
    idempotencyKey: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<import("./types").RecommendationDecisionEventRecord | null>;
  recordDecision(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface RecommendationDecisionCommandInput {
  portfolioItemId: string;
  organisationId: string;
  workspaceId: string;
  actorUserId: string;
  command: Exclude<RecommendationDecisionCommand, "superseded">;
  expectedVersion: number;
  idempotencyKey: string;
  acknowledged: boolean;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
}

function knownDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("RECOMMENDATION_DECISION_VERSION_CONFLICT")) {
    return new RecommendationDecisionServiceError(
      "RECOMMENDATION_DECISION_VERSION_CONFLICT",
      409,
      "This recommendation decision changed. Refresh and try again.",
    );
  }
  if (message.includes("RECOMMENDATION_ACCESS_DENIED")) {
    return new RecommendationDecisionServiceError(
      "RECOMMENDATION_ACCESS_DENIED",
      404,
      "The recommendation is not available.",
    );
  }
  if (message.includes("RECOMMENDATION_DECISION_INVALID")) {
    return new RecommendationDecisionServiceError(
      "RECOMMENDATION_DECISION_INVALID",
      400,
      "The recommendation decision could not be recorded.",
    );
  }
  return null;
}

export class RecommendationDecisionService {
  constructor(private readonly repo: RecommendationDecisionRepository = repository) {}

  async get(
    portfolioItemId: string,
    tenant: { organisationId: string; workspaceId: string },
    includeHistory = true,
  ) {
    const source = await this.repo.getPortfolioItem(portfolioItemId, tenant);
    if (!source) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation is not available.",
      );
    }
    return this.repo.getDecision(source, includeHistory);
  }

  async list(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
    includeHistory = false,
  ) {
    const items = await this.repo.getPortfolioItems(portfolioId, tenant);
    if (!items) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation portfolio is not available.",
      );
    }
    return this.repo.getDecisionsForItems(items, includeHistory);
  }

  async decide(input: RecommendationDecisionCommandInput) {
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.idempotencyKey.length < 16 ||
      input.idempotencyKey.length > 160
    ) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_DECISION_INVALID",
        400,
        "A valid decision version and idempotency key are required.",
      );
    }
    const tenant = {
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
    };
    const source = await this.repo.getPortfolioItem(input.portfolioItemId, tenant);
    if (!source) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation is not available.",
      );
    }
    try {
      const normalized = normalizeRecommendationDecisionFields(input);
      const payload = {
        portfolioItemId: source.id,
        organisationId: source.organisationId,
        workspaceId: source.workspaceId,
        actorUserId: input.actorUserId,
        command: input.command,
        expectedVersion: input.expectedVersion,
        acknowledged: normalized.acknowledged,
        reasonCategory: normalized.reasonCategory,
        reviewAt: normalized.reviewAt,
      };
      const payloadHash = await semanticHash(payload);
      const replay = await this.repo.getDecisionEventByIdempotency(input.idempotencyKey, tenant);
      if (replay) {
        if (replay.portfolioItemId !== source.id || replay.payloadHash !== payloadHash) {
          throw new RecommendationDecisionServiceError(
            "RECOMMENDATION_DECISION_INVALID",
            409,
            "That request key has already been used for a different recommendation decision.",
          );
        }
        return this.repo.getDecision(source, true);
      }
      const current = await this.repo.getDecision(source, false);
      const transition = transitionRecommendationDecision({
        currentState: current.currentState,
        command: input.command,
        ...normalized,
      });
      await this.repo.recordDecision({
        portfolio_item_id: source.id,
        organisation_id: source.organisationId,
        workspace_id: source.workspaceId,
        actor_user_id: input.actorUserId,
        command: transition.command,
        expected_version: input.expectedVersion,
        idempotency_key: input.idempotencyKey,
        acknowledged: transition.acknowledged,
        reason_category: transition.reasonCategory,
        review_at: transition.reviewAt,
        payload_hash: payloadHash,
      });
      return this.repo.getDecision(source, true);
    } catch (error) {
      if (error instanceof RecommendationDecisionError) {
        throw new RecommendationDecisionServiceError(error.code, 400, error.message);
      }
      throw knownDatabaseError(error) ?? error;
    }
  }

  async supersede(input: {
    portfolioItemId: string;
    organisationId: string;
    workspaceId: string;
    expectedVersion: number;
    idempotencyKey: string;
  }) {
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.idempotencyKey.length < 16 ||
      input.idempotencyKey.length > 160
    ) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_DECISION_INVALID",
        400,
        "A valid decision version and idempotency key are required.",
      );
    }
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const source = await this.repo.getPortfolioItem(input.portfolioItemId, tenant);
    if (!source) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation is not available.",
      );
    }
    const payload = {
      portfolioItemId: source.id,
      organisationId: source.organisationId,
      workspaceId: source.workspaceId,
      command: "superseded" as const,
      expectedVersion: input.expectedVersion,
    };
    const payloadHash = await semanticHash(payload);
    try {
      const replay = await this.repo.getDecisionEventByIdempotency(input.idempotencyKey, tenant);
      if (replay) {
        if (replay.portfolioItemId !== source.id || replay.payloadHash !== payloadHash) {
          throw new RecommendationDecisionServiceError(
            "RECOMMENDATION_DECISION_INVALID",
            409,
            "That request key has already been used for a different recommendation decision.",
          );
        }
        return this.repo.getDecision(source, true);
      }
      const current = await this.repo.getDecision(source, false);
      const transition = transitionRecommendationDecision({
        currentState: current.currentState,
        command: "superseded",
        acknowledged: false,
        reasonCategory: null,
        reviewAt: null,
        actorType: "system",
      });
      await this.repo.recordDecision({
        portfolio_item_id: source.id,
        organisation_id: source.organisationId,
        workspace_id: source.workspaceId,
        actor_user_id: null,
        command: transition.command,
        expected_version: input.expectedVersion,
        idempotency_key: input.idempotencyKey,
        acknowledged: false,
        reason_category: null,
        review_at: null,
        payload_hash: payloadHash,
      });
      return this.repo.getDecision(source, true);
    } catch (error) {
      throw knownDatabaseError(error) ?? error;
    }
  }
}

export const recommendationDecisionService = new RecommendationDecisionService();
