import { getOwnerKey } from "../assessment/client";
import type {
  AssessmentScoreSummary,
  Score,
  ScoreRunSummary,
  ScoreSummaryEntity,
  ScoreTrace,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-owner-key": getOwnerKey(),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export const scoreApi = {
  run: (assessmentId: string) =>
    request<{ summary: ScoreSummaryEntity; scores: Score[]; run: ScoreRunSummary }>(
      "/runtime/scores",
      { method: "POST", body: JSON.stringify({ assessmentId }) },
    ),
  listForAssessment: (assessmentId: string) =>
    request<{ sessionId: string; scores: Score[]; summary: ScoreSummaryEntity | null }>(
      `/assessment/${assessmentId}/scores`,
    ),
  get: (scoreId: string) => request<ScoreTrace>(`/score/${scoreId}`),
  /** Dashboard-ready payload: overall score, dimensions and trend series. */
  summary: (assessmentId: string) =>
    request<AssessmentScoreSummary>(`/assessment/${assessmentId}/summary`),
};

export const scoreKeys = {
  all: ["scores"] as const,
  forAssessment: (id: string) => ["scores", "assessment", id] as const,
  summary: (id: string) => ["scores", "summary", id] as const,
  detail: (id: string) => ["scores", "detail", id] as const,
};
