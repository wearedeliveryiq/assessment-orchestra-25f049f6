import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type {
  RecommendationDecisionCommand,
  RecommendationDecisionReasonCategory,
  RecommendationDecisionState,
} from "./model";

export interface RecommendationPortfolioView {
  portfolioId: string;
  analysisRunId: string;
  version: string;
  groups: Array<{
    classification: string;
    label: string;
    recommendations: Array<{
      portfolioItemId: string;
      recommendationId: string;
      recommendationVersion: string;
      title: string;
      outcome: string;
      successMeasures: string[];
      priorityLabel: string;
      impact: string;
      effort: string;
      confidence: { state: string; result: string; caveat: string | null };
      why: { matchedTriggers: string[]; rationale: Array<{ statement: string }> };
      dependencies: Array<{ recommendationId: string; state: string }>;
    }>;
  }>;
}

export interface RecommendationDecisionView {
  portfolioItemId: string;
  recommendationId: string;
  recommendationVersion: string;
  currentDecision: RecommendationDecisionState;
  decisionVersion: number;
  reviewAt: string | null;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  acknowledged: boolean;
  availableActions: Array<Exclude<RecommendationDecisionCommand, "superseded">>;
  statusMessage: string;
  updatedAt: string | null;
}

export interface RecommendationPortfolioDecisionsView {
  portfolioId: string;
  canDecide: boolean;
  decisions: RecommendationDecisionView[];
}

const rememberedKeys = new Map<string, string>();

function idempotencyKey(itemId: string, payload: Record<string, unknown>) {
  const semanticRequest = `${itemId}:${JSON.stringify(payload)}`;
  const existing = rememberedKeys.get(semanticRequest);
  if (existing) return existing;
  const value = `decision-${itemId}-${crypto.randomUUID()}`;
  rememberedKeys.set(semanticRequest, value);
  return value;
}

export async function fetchRecommendationPortfolio(runId: string) {
  const response = await fetch(`/api/analysis-runs/${runId}/recommendation-portfolio`, {
    headers: await assessmentAuthHeaders(),
  });
  if (response.status === 404) return null;
  const body = (await response.json().catch(() => null)) as
    (RecommendationPortfolioView & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error ?? "The recommendation portfolio is unavailable.");
  return body as RecommendationPortfolioView;
}

export async function fetchRecommendationPortfolioDecisions(portfolioId: string) {
  const response = await fetch(`/api/recommendation-portfolios/${portfolioId}/decisions`, {
    headers: await assessmentAuthHeaders(),
  });
  const body = (await response.json().catch(() => null)) as
    (RecommendationPortfolioDecisionsView & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error ?? "Customer decisions are unavailable.");
  return body as RecommendationPortfolioDecisionsView;
}

export async function recordRecommendationDecision(input: {
  portfolioItemId: string;
  expectedVersion: number;
  decision: Exclude<RecommendationDecisionCommand, "superseded">;
  acknowledged?: boolean;
  reasonCategory?: RecommendationDecisionReasonCategory | null;
  reviewAt?: string | null;
}) {
  const payload = {
    portfolioItemId: input.portfolioItemId,
    expectedVersion: input.expectedVersion,
    decision: input.decision,
    acknowledged: input.acknowledged === true,
    reasonCategory: input.reasonCategory ?? null,
    reviewAt: input.reviewAt ?? null,
  };
  const response = await fetch(`/api/portfolio-items/${input.portfolioItemId}/decisions`, {
    method: "POST",
    headers: {
      ...(await assessmentAuthHeaders()),
      "content-type": "application/json",
      "idempotency-key": idempotencyKey(input.portfolioItemId, payload),
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  if (!response.ok) {
    const error = new Error(body?.error ?? "The recommendation decision could not be recorded.");
    Object.assign(error, { code: body?.code, status: response.status });
    throw error;
  }
  rememberedKeys.delete(`${input.portfolioItemId}:${JSON.stringify(payload)}`);
  return body;
}
