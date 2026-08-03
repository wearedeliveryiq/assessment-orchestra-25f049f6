import type {
  ProductHandoffCta,
  ProductHandoffOpportunity,
  ProductHandoffTargetType,
  ProductOperationalState,
} from "./model";

export interface ProductHandoffSource {
  actionId: string;
  portfolioItemId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  actionStatus: "not_started" | "in_progress" | "blocked" | "completed" | "cancelled";
  decisionState: "undecided" | "accepted" | "deferred" | "rejected" | "superseded";
  organisationId: string;
  workspaceId: string;
}

export interface ProductHandoffRecord {
  id: string;
  sourceActionId: string;
  sourcePortfolioItemId: string;
  analysisRunId: string;
  recommendationId: string;
  recommendationVersion: string;
  organisationId: string;
  workspaceId: string;
  targetType: ProductHandoffTargetType;
  targetId: string;
  targetVersion: string;
  cta: ProductHandoffCta;
  consentBasis: "explicit_handoff_request";
  consentedAt: string;
  createdByUserId: string;
  expiresAt: string;
  createdAt: string;
  consumedAt: string | null;
}

export interface ProductHandoffRepository {
  getSource(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<ProductHandoffSource | null>;
  getOperationalStates(organisationId: string): Promise<ProductOperationalState[]>;
  getHandoffByIdempotency(
    idempotencyKey: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<(ProductHandoffRecord & { requestHash: string }) | null>;
  getHandoffByTokenHash(
    tokenHash: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<ProductHandoffRecord | null>;
  createHandoff(input: Record<string, unknown>): Promise<ProductHandoffRecord>;
  consumeHandoff(input: Record<string, unknown>): Promise<ProductHandoffRecord>;
}

export interface ProductHandoffListView {
  actionId: string;
  opportunities: ProductHandoffOpportunity[];
}
