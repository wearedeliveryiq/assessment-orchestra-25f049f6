import type {
  RecommendationCandidateEvaluation,
  RecommendationConfidenceState,
  RecommendationDecisiveFact,
  RecommendationEvaluationResult,
} from "../recommendations/eligibility";

export const RECOMMENDATION_EVALUATION_POLICY_VERSION = "PB-004/S4-002/1.0.0";
export const RECOMMENDATION_EVALUATION_ENGINE_VERSION = "deliveryiq.recommendation-evaluator/1.0.0";

export interface RecommendationEvaluationInput {
  analysisRunId: string;
  intelligenceResultId: string;
  intelligenceResultHash: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  opportunities: string[];
  patterns: string[];
  analysisConfidence: number;
}

export interface PersistedRecommendationCandidate extends RecommendationCandidateEvaluation {
  id: string;
  evaluationId: string;
  organisationId: string;
  workspaceId: string;
  recommendationDefinitionId: string;
  semanticHash: string;
  sourceTraceNodeIds: string[];
}

export interface RecommendationEvaluationRecord {
  id: string;
  analysisRunId: string;
  intelligenceResultId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  evaluatorVersion: string;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationEvaluationInput;
  candidates: PersistedRecommendationCandidate[];
  createdAt: string;
}

export type {
  RecommendationConfidenceState,
  RecommendationDecisiveFact,
  RecommendationEvaluationResult,
};
