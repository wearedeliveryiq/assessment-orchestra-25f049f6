import type { RecommendationResolutionCandidate, RecommendationResolutionOutput } from "./resolver";

export interface RecommendationResolutionInput {
  analysisRunId: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  confidenceGateHash: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
}

export interface PersistedRecommendationResolutionCandidate extends RecommendationResolutionCandidate {
  id: string;
  resolutionId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface RecommendationResolutionRecord {
  id: string;
  analysisRunId: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  resolverVersion: string;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationResolutionInput;
  canonicalResolution: RecommendationResolutionOutput;
  candidates: PersistedRecommendationResolutionCandidate[];
  createdAt: string;
}
