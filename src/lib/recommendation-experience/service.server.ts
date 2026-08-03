import { semanticHash } from "../recommendation-evaluation/evaluator";
import { recommendationActionService } from "../recommendation-actions/service.server";
import { recommendationDecisionService } from "../recommendation-decisions/service.server";
import { getOperationalStates } from "../recommendation-handoffs/repository.server";
import { recommendationPortfolioService } from "../recommendation-portfolio/service.server";
import type { RecommendationActionRecord } from "../recommendation-actions/types";
import type { RecommendationDecisionRecord } from "../recommendation-decisions/types";
import type { ProductOperationalState } from "../recommendation-handoffs/model";
import type { RecommendationPortfolioRecord } from "../recommendation-portfolio/types";
import { recommendationOutcomeService } from "../recommendation-outcomes/service.server";
import type {
  OutcomeMeasureRecord,
  RecommendationActionOutcome,
} from "../recommendation-outcomes/types";
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
  getOutcome(
    actionId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<{
    outcome: RecommendationActionOutcome;
    records: OutcomeMeasureRecord[];
  } | null>;
}

const sources: RecommendationExperienceSources = {
  getPortfolio: (portfolioId, tenant) =>
    recommendationPortfolioService.getById(portfolioId, tenant),
  getDecisions: (portfolioId, tenant) => recommendationDecisionService.list(portfolioId, tenant),
  getActions: (portfolioId, tenant) => recommendationActionService.list(portfolioId, tenant),
  getProducts: getOperationalStates,
  getOutcome: async (actionId, tenant) => {
    const value = await recommendationOutcomeService.getActionOutcome(actionId, tenant);
    return value ? { outcome: value.outcome, records: value.records } : null;
  },
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
    const outcomes = (
      await Promise.all(actions.map((action) => this.source.getOutcome(action.id, tenant)))
    ).filter((value): value is NonNullable<typeof value> => value !== null);
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
      ) ||
      outcomes.some(
        ({ outcome, records }) =>
          outcome.organisationId !== input.organisationId ||
          outcome.workspaceId !== input.workspaceId ||
          !actions.some((action) => action.id === outcome.actionId) ||
          records.some(
            ({ measure }) =>
              measure.organisationId !== input.organisationId ||
              measure.workspaceId !== input.workspaceId ||
              measure.actionId !== outcome.actionId,
          ),
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
      outcomes: outcomes
        .map(({ outcome, records }) => ({
          action: outcome.actionId,
          outcome: outcome.id,
          measures: records
            .map((record) => ({
              id: record.measure.id,
              version: record.measure.version,
              status: record.current.status,
              observation: record.current.decisiveObservationId,
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
        }))
        .sort((left, right) => left.action.localeCompare(right.action)),
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
      outcomes,
      products,
      permissions: input.permissions,
      snapshotAt: (input.now ?? new Date()).toISOString(),
      snapshotVersion,
    });
  }
}

export const recommendationExperienceService = new RecommendationExperienceService();
