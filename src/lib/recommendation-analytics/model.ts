export const recommendationAnalyticsVersion = "deliveryiq.recommendation-analytics/1.0.0";

export const recommendationAnalyticsEventTypes = [
  "portfolio_viewed",
  "explanation_opened",
  "decision_recorded",
  "action_started",
  "action_blocked",
  "action_completed",
  "outcome_observed",
  "knowledge_pack_handoff",
  "teammate_handoff",
  "usefulness_submitted",
] as const;
export type RecommendationAnalyticsEventType = (typeof recommendationAnalyticsEventTypes)[number];

export const recommendationAnalyticsModes = ["workspace", "executive_report"] as const;
export type RecommendationAnalyticsMode = (typeof recommendationAnalyticsModes)[number];

export const recommendationAnalyticsObjectTypes = [
  "portfolio",
  "portfolio_item",
  "decision",
  "action",
  "outcome",
  "handoff",
] as const;
export type RecommendationAnalyticsObjectType = (typeof recommendationAnalyticsObjectTypes)[number];

export type RecommendationAnalyticsProperties = Record<string, string>;

const contracts: Record<
  RecommendationAnalyticsEventType,
  {
    objectTypes: readonly RecommendationAnalyticsObjectType[];
    properties: Record<string, readonly string[]>;
  }
> = {
  portfolio_viewed: { objectTypes: ["portfolio"], properties: {} },
  explanation_opened: { objectTypes: ["portfolio_item"], properties: {} },
  decision_recorded: {
    objectTypes: ["decision"],
    properties: {
      decision_state: ["undecided", "accepted", "deferred", "rejected", "superseded"],
    },
  },
  action_started: { objectTypes: ["action"], properties: { action_state: ["in_progress"] } },
  action_blocked: { objectTypes: ["action"], properties: { action_state: ["blocked"] } },
  action_completed: { objectTypes: ["action"], properties: { action_state: ["completed"] } },
  outcome_observed: { objectTypes: ["outcome"], properties: {} },
  knowledge_pack_handoff: {
    objectTypes: ["handoff"],
    properties: { handoff_state: ["consumed"] },
  },
  teammate_handoff: {
    objectTypes: ["handoff"],
    properties: { handoff_state: ["consumed"] },
  },
  usefulness_submitted: {
    objectTypes: ["portfolio_item"],
    properties: { usefulness: ["helpful", "not_helpful"] },
  },
};

export class RecommendationAnalyticsError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function boundedToken(value: unknown, maximum = 160) {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maximum &&
    /^[A-Za-z0-9._:-]+$/.test(value)
  );
}

export function validateRecommendationAnalyticsEvent(input: {
  eventId: unknown;
  eventType: unknown;
  objectType: unknown;
  objectId: unknown;
  objectVersion: unknown;
  mode: unknown;
  properties: unknown;
  occurredAt: unknown;
}) {
  if (
    !boundedToken(input.eventId) ||
    !recommendationAnalyticsEventTypes.includes(input.eventType as never) ||
    !recommendationAnalyticsObjectTypes.includes(input.objectType as never) ||
    !boundedToken(input.objectId) ||
    !boundedToken(input.objectVersion, 100) ||
    !recommendationAnalyticsModes.includes(input.mode as never) ||
    typeof input.occurredAt !== "string" ||
    !Number.isFinite(Date.parse(input.occurredAt)) ||
    !input.properties ||
    typeof input.properties !== "object" ||
    Array.isArray(input.properties)
  ) {
    throw new RecommendationAnalyticsError(
      "RECOMMENDATION_ANALYTICS_INVALID",
      400,
      "A valid privacy-safe analytics event is required.",
    );
  }
  const eventType = input.eventType as RecommendationAnalyticsEventType;
  const objectType = input.objectType as RecommendationAnalyticsObjectType;
  const contract = contracts[eventType];
  const properties = input.properties as Record<string, unknown>;
  if (
    !contract.objectTypes.includes(objectType) ||
    Object.keys(properties).some(
      (key) =>
        !Object.hasOwn(contract.properties, key) ||
        typeof properties[key] !== "string" ||
        !contract.properties[key].includes(properties[key] as string),
    ) ||
    Object.keys(contract.properties).some((key) => !Object.hasOwn(properties, key))
  ) {
    throw new RecommendationAnalyticsError(
      "RECOMMENDATION_ANALYTICS_PROPERTY_DENIED",
      400,
      "The analytics event contains a property that is not approved.",
    );
  }
  return {
    eventId: input.eventId as string,
    eventType,
    objectType,
    objectId: input.objectId as string,
    objectVersion: input.objectVersion as string,
    mode: input.mode as RecommendationAnalyticsMode,
    properties: properties as RecommendationAnalyticsProperties,
    occurredAt: new Date(input.occurredAt).toISOString(),
  };
}

export function assertAggregateWindow(from: string, to: string) {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (
    !Number.isFinite(fromMs) ||
    !Number.isFinite(toMs) ||
    fromMs >= toMs ||
    toMs - fromMs > 366 * 24 * 60 * 60 * 1000
  ) {
    throw new RecommendationAnalyticsError(
      "RECOMMENDATION_ANALYTICS_WINDOW_INVALID",
      400,
      "Choose a valid analytics reporting window of no more than 366 days.",
    );
  }
}

export const recommendationAnalyticsContracts = contracts;
