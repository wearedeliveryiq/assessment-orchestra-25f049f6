import type {
  RecommendationDecisionCommand,
  RecommendationDecisionReasonCategory,
  RecommendationDecisionState,
} from "./model";

export interface RecommendationDecisionEventRecord {
  id: string;
  portfolioId: string;
  portfolioItemId: string;
  analysisRunId: string;
  organisationId: string;
  workspaceId: string;
  decisionVersion: number;
  command: RecommendationDecisionCommand;
  previousState: RecommendationDecisionState;
  currentState: RecommendationDecisionState;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
  acknowledged: boolean;
  actorType: "user" | "system";
  actorUserId: string | null;
  portfolioPolicyVersion: string;
  catalogueVersionId: string;
  catalogueDigest: string;
  idempotencyKey: string;
  payloadHash: string;
  occurredAt: string;
}

export interface RecommendationDecisionRecord {
  id: string | null;
  portfolioId: string;
  portfolioItemId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  organisationId: string;
  workspaceId: string;
  currentState: RecommendationDecisionState;
  version: number;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
  acknowledged: boolean;
  lastActorType: "user" | "system" | null;
  lastActorUserId: string | null;
  updatedAt: string | null;
  history: RecommendationDecisionEventRecord[];
}

export interface RecommendationDecisionPortfolioItem {
  id: string;
  portfolioId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  organisationId: string;
  workspaceId: string;
  portfolioPolicyVersion: string;
  catalogueVersionId: string;
  catalogueDigest: string;
}
