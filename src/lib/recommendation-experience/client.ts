import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { RecommendationExperienceProjection } from "./model";

export async function fetchRecommendationExperience(portfolioId: string) {
  const response = await fetch(`/api/recommendation-portfolios/${portfolioId}/experience`, {
    headers: await assessmentAuthHeaders(),
  });
  const body = (await response.json().catch(() => null)) as
    (RecommendationExperienceProjection & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(body?.error ?? "The recommendation experience is temporarily unavailable.");
  }
  return body as RecommendationExperienceProjection;
}
