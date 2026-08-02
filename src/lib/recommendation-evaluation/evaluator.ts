import { validateCatalogueSnapshot } from "../recommendation-catalogue/catalogue";
import type { CatalogueSnapshot } from "../recommendation-catalogue/types";
import {
  evaluateRecommendationCandidates,
  type RecommendationCandidateEvaluation,
  type RecommendationSignalInput,
} from "../recommendations/eligibility";
import {
  RECOMMENDATION_EVALUATION_ENGINE_VERSION,
  RECOMMENDATION_EVALUATION_POLICY_VERSION,
} from "./types";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function semanticHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface EvaluatedRecommendationSet {
  schemaVersion: "deliveryiq.recommendation-evaluation/1.0.0";
  policyVersion: string;
  evaluatorVersion: string;
  catalogueId: string;
  catalogueVersion: string;
  candidates: RecommendationCandidateEvaluation[];
}

export function evaluatePinnedCatalogue(
  snapshotInput: CatalogueSnapshot,
  input: RecommendationSignalInput,
): EvaluatedRecommendationSet {
  const snapshot = validateCatalogueSnapshot(snapshotInput);
  return {
    schemaVersion: "deliveryiq.recommendation-evaluation/1.0.0",
    policyVersion: RECOMMENDATION_EVALUATION_POLICY_VERSION,
    evaluatorVersion: RECOMMENDATION_EVALUATION_ENGINE_VERSION,
    catalogueId: snapshot.catalogueId,
    catalogueVersion: snapshot.version,
    candidates: evaluateRecommendationCandidates(snapshot.definitions, input),
  };
}
