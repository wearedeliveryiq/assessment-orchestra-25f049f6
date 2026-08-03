import type {
  RecommendationSequenceDependency,
  RecommendationSequenceItem,
  RecommendationSequenceOutput,
} from "./model";

export interface RecommendationSequenceInput {
  analysisRunId: string;
  priorityModelId: string;
  priorityModelHash: string;
  conflictResolutionId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
}

export interface PersistedRecommendationSequenceItem extends RecommendationSequenceItem {
  id: string;
  sequenceModelId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface PersistedRecommendationSequenceDependency extends RecommendationSequenceDependency {
  id: string;
  sequenceModelId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface RecommendationSequenceOverrideRecord {
  id: string;
  sequenceModelId: string;
  organisationId: string;
  workspaceId: string;
  version: number;
  previousOverrideId: string | null;
  orderedRecommendationIds: string[];
  reason: string;
  acknowledgedRisk: true;
  dependencyRisks: Array<{
    dependantRecommendationId: string;
    dependencyRecommendationId: string;
    dependencyType: "required" | "recommended";
  }>;
  actorUserId: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface RecommendationSequenceRecord {
  id: string;
  analysisRunId: string;
  priorityModelId: string;
  conflictResolutionId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  engineVersion: string;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationSequenceInput;
  canonicalSequence: RecommendationSequenceOutput;
  items: PersistedRecommendationSequenceItem[];
  dependencies: PersistedRecommendationSequenceDependency[];
  override: RecommendationSequenceOverrideRecord | null;
  createdAt: string;
}
