import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { RecommendationActionState } from "./model";

export interface RecommendationActionView {
  actionId: string;
  portfolioItemId: string;
  recommendationId: string;
  recommendationVersion: string;
  planVersion: number;
  status: RecommendationActionState;
  actionVersion: number;
  accountableOwnerId: string | null;
  contributorIds: string[];
  targetDate: string | null;
  note: string | null;
  completionNote: string | null;
  evidenceReferences: string[];
  evidenceNotAvailableReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
  statusMessage: string;
}

export interface RecommendationPortfolioActionsView {
  portfolioId: string;
  canManageActions: boolean;
  actions: RecommendationActionView[];
}

const rememberedKeys = new Map<string, string>();

function key(scope: string, payload: Record<string, unknown>) {
  const semanticRequest = `${scope}:${JSON.stringify(payload)}`;
  const existing = rememberedKeys.get(semanticRequest);
  if (existing) return existing;
  const value = `action-${scope}-${crypto.randomUUID()}`;
  rememberedKeys.set(semanticRequest, value);
  return value;
}

async function response<T>(request: Promise<Response>, fallback: string, semanticRequest: string) {
  const result = await request;
  const body = (await result.json().catch(() => null)) as
    (T & { error?: string; code?: string }) | null;
  if (!result.ok) {
    const error = new Error(body?.error ?? fallback);
    Object.assign(error, { status: result.status, code: body?.code });
    throw error;
  }
  rememberedKeys.delete(semanticRequest);
  return body as T;
}

export async function fetchRecommendationPortfolioActions(portfolioId: string) {
  const result = await fetch(`/api/recommendation-portfolios/${portfolioId}/actions`, {
    headers: await assessmentAuthHeaders(),
  });
  const body = (await result.json().catch(() => null)) as
    (RecommendationPortfolioActionsView & { error?: string }) | null;
  if (!result.ok) throw new Error(body?.error ?? "Improvement actions are unavailable.");
  return body as RecommendationPortfolioActionsView;
}

export async function createRecommendationAction(portfolioItemId: string) {
  const payload = { portfolioItemId, planVersion: 1, expectedVersion: 0 };
  const semanticRequest = `${portfolioItemId}:${JSON.stringify(payload)}`;
  return response<RecommendationActionView>(
    fetch(`/api/portfolio-items/${portfolioItemId}/actions`, {
      method: "POST",
      headers: {
        ...(await assessmentAuthHeaders()),
        "content-type": "application/json",
        "idempotency-key": key(portfolioItemId, payload),
      },
      body: JSON.stringify(payload),
    }),
    "The improvement action could not be created.",
    semanticRequest,
  );
}

export async function updateRecommendationAction(
  actionId: string,
  payload: Record<string, unknown> & { expectedVersion: number; command: string },
) {
  const semanticRequest = `${actionId}:${JSON.stringify(payload)}`;
  return response<RecommendationActionView>(
    fetch(`/api/improvement-actions/${actionId}`, {
      method: "PATCH",
      headers: {
        ...(await assessmentAuthHeaders()),
        "content-type": "application/json",
        "idempotency-key": key(actionId, payload),
      },
      body: JSON.stringify(payload),
    }),
    "The improvement action could not be changed.",
    semanticRequest,
  );
}
