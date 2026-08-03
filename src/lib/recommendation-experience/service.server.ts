import { semanticHash } from "../recommendation-evaluation/evaluator";
import { recommendationActionService } from "../recommendation-actions/service.server";
import { recommendationDecisionService } from "../recommendation-decisions/service.server";
import { getOperationalStates } from "../recommendation-handoffs/repository.server";
import { recommendationPortfolioService } from "../recommendation-portfolio/service.server";
import type { RecommendationActionRecord } from "../recommendation-actions/types";
import type { RecommendationDecisionRecord } from "../recommendation-decisions/types";
import type { ProductOperationalState } from "../recommendation-handoffs/model";
import type { RecommendationPortfolioRecord } from "../recommendation-portfolio/types";
import { projectRecommendationExperience, RecommendationExperienceError } from "./model";

export interface RecommendationExperienceSources {
  getPortfolio(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPortfolioRecord | null>;
  getDecisions(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationDecisionRecord[]>;
  getActions(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationActionRecord[]>;
  getProducts(organisationId: string): Promise<ProductOperationalState[]>;
}

const sources: RecommendationExperienceSources = {
  getPortfolio: (portfolioId, tenant) =>
    recommendationPortfolioService.getById(portfolioId, tenant),
  getDecisions: (portfolioId, tenant) => recommendationDecisionService.list(portfolioId, tenant),
  getActions: (portfolioId, tenant) => recommendationActionService.list(portfolioId, tenant),
  getProducts: getOperationalStates,
};

export class RecommendationExperienceService {
  constructor(private readonly source: RecommendationExperienceSources = sources) {}

  async get(input: {
    portfolioId: string;
    organisationId: string;
    workspaceId: string;
    permissions: readonly string[];
    now?: Date;
  }) {
    const tenant = { organisationId: input.organisationId, workspaceId: input.workspaceId };
    const portfolio = await this.source.getPortfolio(input.portfolioId, tenant);
    if (!portfolio) {
      throw new RecommendationExperienceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation portfolio is not available.",
      );
    }
    const [decisions, actions, products] = await Promise.all([
      this.source.getDecisions(portfolio.id, tenant),
      this.source.getActions(portfolio.id, tenant),
      this.source.getProducts(input.organisationId),
    ]);
    const itemIds = new Set(portfolio.items.map((item) => item.id));
    if (
      portfolio.organisationId !== input.organisationId ||
      portfolio.workspaceId !== input.workspaceId ||
      decisions.some(
        (record) =>
          record.organisationId !== input.organisationId ||
          record.workspaceId !== input.workspaceId ||
          record.portfolioId !== portfolio.id ||
          !itemIds.has(record.portfolioItemId),
      ) ||
      actions.some(
        (record) =>
          record.organisationId !== input.organisationId ||
          record.workspaceId !== input.workspaceId ||
          record.portfolioId !== portfolio.id ||
          !itemIds.has(record.portfolioItemId),
      )
    ) {
      throw new RecommendationExperienceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation portfolio is not available.",
      );
    }
    const snapshotVersion = await semanticHash({
      portfolio: portfolio.outputHash,
      decisions: decisions
        .map((record) => ({
          item: record.portfolioItemId,
          version: record.version,
          state: record.currentState,
          updatedAt: record.updatedAt,
        }))
        .sort((left, right) => left.item.localeCompare(right.item)),
      actions: actions
        .map((record) => ({
          item: record.portfolioItemId,
          version: record.version,
          state: record.status,
          updatedAt: record.updatedAt,
        }))
        .sort((left, right) => left.item.localeCompare(right.item)),
      products: [...products].sort((left, right) =>
        `${left.targetType}:${left.targetId}`.localeCompare(
          `${right.targetType}:${right.targetId}`,
        ),
      ),
      permissions: [...input.permissions].sort(),
    });
    return projectRecommendationExperience({
      portfolio,
      decisions,
      actions,
      products,
      permissions: input.permissions,
      snapshotAt: (input.now ?? new Date()).toISOString(),
      snapshotVersion,
    });
  }
}

export const recommendationExperienceService = new RecommendationExperienceService();
