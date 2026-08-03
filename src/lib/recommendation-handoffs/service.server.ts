import { semanticHash } from "../recommendation-evaluation/evaluator";
import {
  ProductHandoffError,
  requireHandoffOpportunity,
  resolveProductHandoffOpportunities,
  type ProductHandoffCta,
  type ProductHandoffTargetType,
} from "./model";
import { productHandoffRepository } from "./repository.server";
import { hashHandoffToken, stableHandoffToken } from "./token.server";
import type { ProductHandoffRepository } from "./types";

export class ProductHandoffServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const HANDOFF_TTL_MS = 10 * 60 * 1_000;

function mappedError(error: unknown) {
  if (error instanceof ProductHandoffError) {
    return new ProductHandoffServiceError(error.code, 409, error.message);
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("PRODUCT_HANDOFF_EXPIRED")) {
    return new ProductHandoffServiceError(
      "PRODUCT_HANDOFF_EXPIRED",
      410,
      "This hand-off has expired. Request a new one after availability is rechecked.",
    );
  }
  if (
    message.includes("PRODUCT_HANDOFF_NOT_AVAILABLE") ||
    message.includes("PRODUCT_HANDOFF_ACCESS_DENIED")
  ) {
    return new ProductHandoffServiceError(
      "PRODUCT_HANDOFF_NOT_AVAILABLE",
      404,
      "This next step is not currently available.",
    );
  }
  if (message.includes("PRODUCT_HANDOFF_INVALID")) {
    return new ProductHandoffServiceError(
      "PRODUCT_HANDOFF_INVALID",
      400,
      "The hand-off request is invalid.",
    );
  }
  return null;
}

function validateIdempotency(value: string) {
  if (value.length < 16 || value.length > 160) {
    throw new ProductHandoffServiceError(
      "PRODUCT_HANDOFF_INVALID",
      400,
      "A valid request key is required.",
    );
  }
}

export class ProductHandoffService {
  constructor(private readonly repo: ProductHandoffRepository = productHandoffRepository) {}

  async opportunities(input: {
    actionId: string;
    organisationId: string;
    workspaceId: string;
    permissions: readonly string[];
  }) {
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const source = await this.repo.getSource(input.actionId, tenant);
    if (!source) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_NOT_AVAILABLE",
        404,
        "This action is not available.",
      );
    }
    if (source.actionStatus === "cancelled") return [];
    const products = await this.repo.getOperationalStates(input.organisationId);
    return resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: source.decisionState === "accepted",
      permissions: input.permissions,
      products,
    });
  }

  async create(input: {
    actionId: string;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
    permissions: readonly string[];
    targetType: ProductHandoffTargetType;
    targetId: string;
    targetVersion: string;
    cta: ProductHandoffCta;
    consentAcknowledged: boolean;
    idempotencyKey: string;
  }) {
    validateIdempotency(input.idempotencyKey);
    if (!input.consentAcknowledged) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_INVALID",
        400,
        "Confirm this hand-off before continuing.",
      );
    }
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const requestHash = await semanticHash({
      actionId: input.actionId,
      actorUserId: input.actorUserId,
      ...tenant,
      targetType: input.targetType,
      targetId: input.targetId,
      targetVersion: input.targetVersion,
      cta: input.cta,
      consentBasis: "explicit_handoff_request",
    });
    const token = await stableHandoffToken(
      `${input.idempotencyKey}\n${requestHash}\n${input.actorUserId}`,
    );
    const replay = await this.repo.getHandoffByIdempotency(input.idempotencyKey, tenant);
    if (replay) {
      if (replay.sourceActionId !== input.actionId || replay.requestHash !== requestHash) {
        throw new ProductHandoffServiceError(
          "PRODUCT_HANDOFF_INVALID",
          409,
          "That request key has already been used for another hand-off.",
        );
      }
      const { requestHash: _requestHash, ...replayedHandoff } = replay;
      return { handoff: replayedHandoff, token };
    }
    const source = await this.repo.getSource(input.actionId, tenant);
    if (!source || source.actionStatus === "cancelled") {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_NOT_AVAILABLE",
        404,
        "This action is not available for a hand-off.",
      );
    }
    const products = await this.repo.getOperationalStates(input.organisationId);
    const opportunities = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: source.decisionState === "accepted",
      permissions: input.permissions,
      products,
    });
    requireHandoffOpportunity(opportunities, input);
    const now = new Date();
    try {
      const handoff = await this.repo.createHandoff({
        source_action_id: source.actionId,
        source_portfolio_item_id: source.portfolioItemId,
        analysis_run_id: source.analysisRunId,
        recommendation_id: source.recommendationId,
        recommendation_version: source.recommendationVersion,
        organisation_id: source.organisationId,
        workspace_id: source.workspaceId,
        target_type: input.targetType,
        target_id: input.targetId,
        target_version: input.targetVersion,
        cta: input.cta,
        consent_basis: "explicit_handoff_request",
        actor_user_id: input.actorUserId,
        token_hash: await hashHandoffToken(token),
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        expires_at: new Date(now.getTime() + HANDOFF_TTL_MS).toISOString(),
      });
      return { handoff, token };
    } catch (error) {
      throw mappedError(error) ?? error;
    }
  }

  async consume(input: {
    token: string;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
    permissions: readonly string[];
  }) {
    if (!/^diq_handoff_[A-Za-z0-9_-]{40,}$/.test(input.token)) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_INVALID",
        400,
        "A valid hand-off token is required.",
      );
    }
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const tokenHash = await hashHandoffToken(input.token);
    const record = await this.repo.getHandoffByTokenHash(tokenHash, tenant);
    if (!record || record.createdByUserId !== input.actorUserId) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_NOT_AVAILABLE",
        404,
        "This hand-off is not available.",
      );
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_EXPIRED",
        410,
        "This hand-off has expired. Request a new one.",
      );
    }
    const source = await this.repo.getSource(record.sourceActionId, tenant);
    if (!source || source.actionStatus === "cancelled") {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_NOT_AVAILABLE",
        404,
        "This hand-off is no longer available.",
      );
    }
    const opportunities = resolveProductHandoffOpportunities({
      recommendationId: source.recommendationId,
      recommendationAccepted: source.decisionState === "accepted",
      permissions: input.permissions,
      products: await this.repo.getOperationalStates(input.organisationId),
    });
    requireHandoffOpportunity(opportunities, record);
    try {
      return await this.repo.consumeHandoff({
        token_hash: tokenHash,
        organisation_id: input.organisationId,
        workspace_id: input.workspaceId,
        actor_user_id: input.actorUserId,
      });
    } catch (error) {
      throw mappedError(error) ?? error;
    }
  }
}

export const productHandoffService = new ProductHandoffService();
