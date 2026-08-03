import { semanticHash } from "../recommendation-evaluation/evaluator";
import {
  assertAggregateWindow,
  recommendationAnalyticsVersion,
  RecommendationAnalyticsError,
  validateRecommendationAnalyticsEvent,
} from "./model";
import { recommendationAnalyticsPseudonym } from "./pseudonym.server";
import { recommendationAnalyticsRepository } from "./repository.server";
import type {
  RecommendationAnalyticsAggregate,
  RecommendationAnalyticsConsent,
  RecommendationAnalyticsConsentStatus,
  RecommendationAnalyticsEvent,
} from "./types";

export interface RecommendationAnalyticsRepository {
  getConsent(
    organisationId: string,
    userId: string,
  ): Promise<RecommendationAnalyticsConsent | null>;
  setConsent(input: {
    organisationId: string;
    workspaceId: string;
    userId: string;
    status: RecommendationAnalyticsConsentStatus;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<RecommendationAnalyticsConsent>;
  sourceExists(input: {
    objectType: string;
    objectId: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<boolean>;
  capture(input: Record<string, unknown>): Promise<RecommendationAnalyticsEvent>;
  aggregate(from: string, to: string): Promise<RecommendationAnalyticsAggregate[]>;
}

export class RecommendationAnalyticsService {
  constructor(
    private readonly repository: RecommendationAnalyticsRepository = recommendationAnalyticsRepository,
    private readonly pseudonym = recommendationAnalyticsPseudonym,
  ) {}

  async consent(organisationId: string, userId: string) {
    return this.repository.getConsent(organisationId, userId);
  }

  async setConsent(input: {
    organisationId: string;
    workspaceId: string;
    userId: string;
    status: RecommendationAnalyticsConsentStatus;
    idempotencyKey: string;
  }) {
    if (!input.idempotencyKey || input.idempotencyKey.length > 160) {
      throw new RecommendationAnalyticsError(
        "RECOMMENDATION_ANALYTICS_CONSENT_INVALID",
        400,
        "A valid consent request is required.",
      );
    }
    return this.repository.setConsent({
      ...input,
      requestHash: await semanticHash({
        organisationId: input.organisationId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        status: input.status,
      }),
    });
  }

  async capture(input: {
    eventId: unknown;
    eventType: unknown;
    objectType: unknown;
    objectId: unknown;
    objectVersion: unknown;
    mode: unknown;
    properties: unknown;
    occurredAt: unknown;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
  }): Promise<{
    recorded: boolean;
    reason?: "consent_required";
    event?: RecommendationAnalyticsEvent;
  }> {
    const validated = validateRecommendationAnalyticsEvent(input);
    const consent = await this.repository.getConsent(input.organisationId, input.actorUserId);
    if (consent?.status !== "granted") return { recorded: false, reason: "consent_required" };
    if (
      !(await this.repository.sourceExists({
        ...validated,
        organisationId: input.organisationId,
        workspaceId: input.workspaceId,
      }))
    ) {
      throw new RecommendationAnalyticsError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The analytics source is not available.",
      );
    }
    const actorPseudonym = await this.pseudonym(input.organisationId, input.actorUserId);
    const payload = {
      ...validated,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      actorPseudonym,
      consentEventId: consent.id,
      schemaVersion: recommendationAnalyticsVersion,
    };
    return {
      recorded: true,
      event: await this.repository.capture({
        ...payload,
        requestHash: await semanticHash(payload),
      }),
    };
  }

  async captureSafely(input: Parameters<RecommendationAnalyticsService["capture"]>[0]) {
    try {
      return await this.capture(input);
    } catch (error) {
      console.warn("[recommendation-analytics] non-blocking capture failed", {
        eventType: input.eventType,
        objectType: input.objectType,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { recorded: false as const };
    }
  }

  async aggregate(from: string, to: string) {
    assertAggregateWindow(from, to);
    const rows = await this.repository.aggregate(from, to);
    if (rows.some((row) => row.tenantCount < 10)) {
      throw new RecommendationAnalyticsError(
        "RECOMMENDATION_ANALYTICS_PRIVACY_THRESHOLD",
        500,
        "Analytics aggregation failed its privacy threshold.",
      );
    }
    return { minimumTenantCohort: 10, from, to, rows };
  }
}

export const recommendationAnalyticsService = new RecommendationAnalyticsService();

export const captureRecommendationAnalyticsSafely = (
  input: Parameters<RecommendationAnalyticsService["capture"]>[0],
) => recommendationAnalyticsService.captureSafely(input);
