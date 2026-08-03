import type {
  RecommendationAnalyticsEventType,
  RecommendationAnalyticsMode,
  RecommendationAnalyticsObjectType,
  RecommendationAnalyticsProperties,
} from "./model";

export type RecommendationAnalyticsConsentStatus = "granted" | "withdrawn";

export interface RecommendationAnalyticsConsent {
  id: string;
  organisationId: string;
  userId: string;
  status: RecommendationAnalyticsConsentStatus;
  version: number;
  occurredAt: string;
}

export interface RecommendationAnalyticsEvent {
  eventId: string;
  organisationId: string;
  workspaceId: string;
  actorPseudonym: string;
  eventType: RecommendationAnalyticsEventType;
  objectType: RecommendationAnalyticsObjectType;
  objectId: string;
  objectVersion: string;
  mode: RecommendationAnalyticsMode;
  properties: RecommendationAnalyticsProperties;
  occurredAt: string;
  schemaVersion: string;
}

export interface RecommendationAnalyticsAggregate {
  eventType: RecommendationAnalyticsEventType;
  mode: RecommendationAnalyticsMode;
  properties: RecommendationAnalyticsProperties;
  tenantCount: number;
  eventCount: number;
}
