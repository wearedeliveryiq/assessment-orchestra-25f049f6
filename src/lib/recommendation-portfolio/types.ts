import type { RecommendationPortfolioItem, RecommendationPortfolioOutput } from "./model";

export interface RecommendationPortfolioInput {
  analysisRunId: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  conflictResolutionId: string;
  priorityModelId: string;
  priorityModelHash: string;
  sequenceModelId: string;
  sequenceModelHash: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
}

export interface PersistedRecommendationPortfolioItem extends RecommendationPortfolioItem {
  id: string;
  portfolioId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface RecommendationPortfolioRecord {
  id: string;
  analysisRunId: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  conflictResolutionId: string;
  priorityModelId: string;
  sequenceModelId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  projectorVersion: string;
  state: "empty" | "partial" | "complete";
  itemCount: number;
  scheduledCount: number;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationPortfolioInput;
  canonicalPortfolio: RecommendationPortfolioOutput;
  items: PersistedRecommendationPortfolioItem[];
  createdAt: string;
}
