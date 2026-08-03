import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { OutcomeDirection, OutcomeProjection, OutcomeValue } from "./types";

export interface OutcomeMeasureView {
  measureId: string;
  measureVersionId: string;
  version: number;
  direction: OutcomeDirection;
  unit: string;
  decimalScale: number;
  baselineValue: OutcomeValue | null;
  baselineEffectiveAt: string | null;
  targetValue: OutcomeValue | null;
  tolerance: string | null;
  targetDate: string | null;
  targetTimezone: string | null;
  cadence: string;
  accountableOwnerId: string;
  sourceDescription: string;
  observations: Array<{
    id: string;
    value: OutcomeValue;
    effectiveAt: string;
    recordedAt: string;
    sourceDescription: string;
    supersedesObservationId: string | null;
    correctionReason: string | null;
    corrected: boolean;
  }>;
  current: OutcomeProjection;
}

export interface RecommendationOutcomeView {
  outcomeId: string;
  actionId: string;
  recommendationId: string;
  recommendationVersion: string;
  intendedOutcome: string;
  successMeasureTemplates: string[];
  associationNotice: string;
  policyVersion: string;
  measures: OutcomeMeasureView[];
}

export interface RecommendationOutcomeResponse {
  actionId?: string;
  outcome: RecommendationOutcomeView | null;
  canManageOutcome?: boolean;
}

async function parse<T>(result: Response, fallback: string) {
  const body = (await result.json().catch(() => null)) as
    (T & { error?: string; code?: string }) | null;
  if (!result.ok) {
    const error = new Error(body?.error ?? fallback);
    Object.assign(error, { status: result.status, code: body?.code });
    throw error;
  }
  return body as T;
}

export async function fetchRecommendationOutcome(actionId: string) {
  return parse<RecommendationOutcomeResponse>(
    await fetch(`/api/improvement-actions/${actionId}/outcomes`, {
      headers: await assessmentAuthHeaders(),
    }),
    "Outcome measurement is unavailable.",
  );
}

export async function configureRecommendationOutcome(
  actionId: string,
  payload: Record<string, unknown>,
) {
  return parse(
    await fetch(`/api/improvement-actions/${actionId}/outcomes`, {
      method: "POST",
      headers: { ...(await assessmentAuthHeaders()), "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "The outcome measure could not be saved.",
  );
}

export async function recordRecommendationOutcomeObservation(
  measureVersionId: string,
  payload: Record<string, unknown>,
) {
  return parse(
    await fetch(`/api/outcome-measures/${measureVersionId}/observations`, {
      method: "POST",
      headers: {
        ...(await assessmentAuthHeaders()),
        "content-type": "application/json",
        "idempotency-key": `outcome-${measureVersionId}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify(payload),
    }),
    "The observation could not be recorded.",
  );
}

export async function retireRecommendationOutcomeMeasure(
  actionId: string,
  measureVersionId: string,
  expectedVersion: number,
) {
  return parse(
    await fetch(`/api/improvement-actions/${actionId}/outcomes`, {
      method: "POST",
      headers: { ...(await assessmentAuthHeaders()), "content-type": "application/json" },
      body: JSON.stringify({ command: "retire", measureVersionId, expectedVersion }),
    }),
    "The outcome measure could not be retired.",
  );
}
