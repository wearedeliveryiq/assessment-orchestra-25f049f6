import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type {
  RecommendationAnalyticsEventType,
  RecommendationAnalyticsMode,
  RecommendationAnalyticsObjectType,
  RecommendationAnalyticsProperties,
} from "./model";

export interface RecommendationAnalyticsConsentView {
  status: "not_set" | "granted" | "withdrawn";
  version: number;
  occurredAt: string | null;
}

async function body<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? fallback);
  return payload as T;
}

export async function fetchRecommendationAnalyticsConsent() {
  return body<RecommendationAnalyticsConsentView>(
    await fetch("/api/recommendation-analytics/consent", {
      headers: await assessmentAuthHeaders(),
    }),
    "Privacy preferences are temporarily unavailable.",
  );
}

export async function setRecommendationAnalyticsConsent(status: "granted" | "withdrawn") {
  return body<RecommendationAnalyticsConsentView>(
    await fetch("/api/recommendation-analytics/consent", {
      method: "POST",
      headers: {
        ...(await assessmentAuthHeaders()),
        "content-type": "application/json",
        "idempotency-key": `analytics-consent-${status}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ status }),
    }),
    "The privacy preference could not be saved.",
  );
}

export async function sendRecommendationAnalyticsEvent(input: {
  eventId?: string;
  eventType: RecommendationAnalyticsEventType;
  objectType: RecommendationAnalyticsObjectType;
  objectId: string;
  objectVersion: string;
  mode?: RecommendationAnalyticsMode;
  properties?: RecommendationAnalyticsProperties;
  occurredAt?: string;
}) {
  try {
    return await body<{ recorded: boolean; reason: string | null }>(
      await fetch("/api/recommendation-analytics/events", {
        method: "POST",
        headers: { ...(await assessmentAuthHeaders()), "content-type": "application/json" },
        body: JSON.stringify({
          ...input,
          eventId: input.eventId ?? `analytics-${crypto.randomUUID()}`,
          mode: input.mode ?? "workspace",
          properties: input.properties ?? {},
          occurredAt: input.occurredAt ?? new Date().toISOString(),
        }),
      }),
      "Analytics is temporarily unavailable.",
    );
  } catch {
    return { recorded: false, reason: "unavailable" };
  }
}
