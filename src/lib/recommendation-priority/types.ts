import type { RecommendationPriorityItem, RecommendationPriorityOutput } from "./model";

export interface RecommendationPriorityInput {
  analysisRunId: string;
  intelligenceResultId: string;
  intelligenceResultHash: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  conflictResolutionId: string;
  conflictResolutionHash: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  analysisConfidence: number;
}

export interface PersistedRecommendationPriorityItem extends RecommendationPriorityItem {
  id: string;
  priorityModelId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface RecommendationPriorityPreferenceRecord {
  id: string;
  priorityModelId: string;
  organisationId: string;
  workspaceId: string;
  version: number;
  previousPreferenceId: string | null;
  orderedRecommendationIds: string[];
  actorUserId: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface RecommendationPriorityRecord {
  id: string;
  analysisRunId: string;
  intelligenceResultId: string;
  recommendationEvaluationId: string;
  confidenceGateId: string;
  conflictResolutionId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  modelVersion: string;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationPriorityInput;
  canonicalPriority: RecommendationPriorityOutput;
  items: PersistedRecommendationPriorityItem[];
  preference: RecommendationPriorityPreferenceRecord | null;
  createdAt: string;
}
