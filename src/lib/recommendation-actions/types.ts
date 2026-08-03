import type { RecommendationActionCommand, RecommendationActionState } from "./model";

export interface RecommendationActionSource {
  portfolioItemId: string;
  portfolioId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  title: string;
  generatedSequence: number | null;
  organisationId: string;
  workspaceId: string;
  dependencies: Array<{ recommendationId: string; type: "required" | "recommended" }>;
  decisionId: string | null;
  decisionVersion: number;
  decisionState: "undecided" | "accepted" | "deferred" | "rejected" | "superseded";
}

export interface RecommendationActionEventRecord {
  id: string;
  actionId: string;
  planId: string;
  portfolioItemId: string;
  organisationId: string;
  workspaceId: string;
  actionVersion: number;
  command: RecommendationActionCommand;
  previousState: RecommendationActionState | null;
  currentState: RecommendationActionState;
  accountableOwnerId: string | null;
  contributorIds: string[];
  targetDate: string | null;
  note: string | null;
  completionNote: string | null;
  evidenceReferences: string[];
  evidenceNotAvailableReason: string | null;
  dependencyOverride: boolean;
  blockingDependencyIds: string[];
  dependencyOverrideReason: string | null;
  dependencyOverrideAcknowledged: boolean;
  actorUserId: string;
  idempotencyKey: string;
  payloadHash: string;
  occurredAt: string;
}

export interface RecommendationActionRecord {
  id: string;
  planId: string;
  planVersion: number;
  portfolioId: string;
  portfolioItemId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  sourceDecisionId: string;
  sourceDecisionVersion: number;
  organisationId: string;
  workspaceId: string;
  status: RecommendationActionState;
  version: number;
  accountableOwnerId: string | null;
  contributorIds: string[];
  targetDate: string | null;
  note: string | null;
  completionNote: string | null;
  evidenceReferences: string[];
  evidenceNotAvailableReason: string | null;
  latestEventId: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  history: RecommendationActionEventRecord[];
}
