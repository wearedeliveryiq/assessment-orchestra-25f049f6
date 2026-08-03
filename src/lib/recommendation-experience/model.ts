import { projectRecommendationAction } from "../recommendation-actions/projection";
import type { RecommendationActionRecord } from "../recommendation-actions/types";
import { projectRecommendationDecision } from "../recommendation-decisions/projection";
import type { RecommendationDecisionRecord } from "../recommendation-decisions/types";
import {
  resolveProductHandoffOpportunities,
  type ProductOperationalState,
} from "../recommendation-handoffs/model";
import { projectRecommendationPortfolio } from "../recommendation-portfolio/projection";
import type { RecommendationPortfolioRecord } from "../recommendation-portfolio/types";

type NonPublicPortfolioProjection = Extract<
  ReturnType<typeof projectRecommendationPortfolio>,
  { groups: unknown }
>;
type WorkspaceRecommendation = Extract<
  NonPublicPortfolioProjection["groups"][number]["recommendations"][number],
  { title: string }
>;
type WorkspacePortfolioProjection = Omit<NonPublicPortfolioProjection, "groups"> & {
  groups: Array<
    Omit<NonPublicPortfolioProjection["groups"][number], "recommendations"> & {
      recommendations: WorkspaceRecommendation[];
    }
  >;
};

export const recommendationExperienceVersion = "deliveryiq.recommendation-experience/1.0.0";

export class RecommendationExperienceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function projectRecommendationExperience(input: {
  portfolio: RecommendationPortfolioRecord;
  decisions: RecommendationDecisionRecord[];
  actions: RecommendationActionRecord[];
  products: ProductOperationalState[];
  permissions: readonly string[];
  snapshotAt: string;
  snapshotVersion: string;
}) {
  const portfolio = projectRecommendationPortfolio(
    input.portfolio,
    "workspace",
  ) as WorkspacePortfolioProjection;
  if (!("groups" in portfolio)) {
    throw new RecommendationExperienceError(
      "RECOMMENDATION_EXPERIENCE_INVALID",
      500,
      "The recommendation experience could not be prepared.",
    );
  }
  const decisions = new Map(
    input.decisions.map((record) => [
      record.portfolioItemId,
      projectRecommendationDecision(record, "workspace"),
    ]),
  );
  const actions = new Map(
    input.actions.map((record) => [
      record.portfolioItemId,
      projectRecommendationAction(record, "workspace"),
    ]),
  );
  const groups = portfolio.groups.map((group) => ({
    ...group,
    recommendations: group.recommendations.map((recommendation) => {
      const decision = decisions.get(recommendation.portfolioItemId) ?? null;
      const action = actions.get(recommendation.portfolioItemId) ?? null;
      return {
        ...recommendation,
        sourceVersions: {
          recommendation: recommendation.recommendationVersion,
          portfolioPolicy: portfolio.version,
          catalogue: portfolio.catalogue.version,
          configurationSet: input.portfolio.configurationSetId,
        },
        decision,
        action,
        handoffs:
          action && action.status !== "cancelled"
            ? resolveProductHandoffOpportunities({
                recommendationId: recommendation.recommendationId,
                recommendationAccepted: decision?.currentDecision === "accepted",
                permissions: input.permissions,
                products: input.products,
              })
            : [],
      };
    }),
  }));
  const decisionCounts = Object.fromEntries(
    ["undecided", "accepted", "deferred", "rejected", "superseded"].map((state) => [
      state,
      input.decisions.filter((decision) => decision.currentState === state).length,
    ]),
  );
  const actionCounts = Object.fromEntries(
    ["not_started", "in_progress", "blocked", "completed", "cancelled"].map((state) => [
      state,
      input.actions.filter((action) => action.status === state).length,
    ]),
  );
  return {
    ...portfolio,
    experienceVersion: recommendationExperienceVersion,
    snapshot: {
      at: input.snapshotAt,
      version: input.snapshotVersion,
      generatedBaselineAt: portfolio.generatedAt,
      generatedBaselineVersion: portfolio.version,
      catalogueId: portfolio.catalogue.id,
      catalogueVersion: portfolio.catalogue.version,
    },
    labels: {
      generated: "Generated advice",
      customer: "Customer decision and progress",
    },
    portfolioSummary: portfolio.summary,
    controls: {
      canDecide: input.permissions.includes("assessment:submit"),
      canManageActions: input.permissions.includes("workspace:manage"),
      canViewAudit: input.permissions.includes("audit:read"),
      canManageMembership: input.permissions.includes("member:role_change"),
      canGovernProductRules: input.permissions.includes("recommendation:govern"),
    },
    summary: {
      recommendationCount: input.portfolio.itemCount,
      traceCoveragePercentage: portfolio.traceCoverage.percentage,
      decisions: decisionCounts,
      actions: actionCounts,
    },
    report: {
      title: "DeliveryIQ recommendation executive report",
      generatedLabel: "Generated advice baseline",
      customerLabel: "Customer decision and progress overlay",
      associationNotice:
        "Action progress is associated with this advice. It does not prove that DeliveryIQ caused an outcome.",
    },
    groups,
  };
}

export type RecommendationExperienceProjection = ReturnType<typeof projectRecommendationExperience>;
