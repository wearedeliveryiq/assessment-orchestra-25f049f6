import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import {
  projectRecommendationPortfolio,
  recommendationPortfolioEtag,
  recommendationPortfolioEtagMatches,
} from "./projection";
import {
  recommendationPortfolioService,
  RecommendationPortfolioServiceError,
} from "./service.server";

const json = (body: unknown, status: number, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-cache, max-age=0",
      vary: "cookie, authorization",
      ...headers,
    },
  });

async function runContext(request: Request, runId: string) {
  const verified = await assessmentRequestContext(request);
  assertPermission(verified.identity, "assessment:read");
  const run = await assessmentAnalysisService.get(runId, {
    ownerKey: verified.ownerKey,
    organisationId: verified.organisationId,
    workspaceId: verified.workspaceId,
    userId: verified.identity.user.id,
  });
  return { verified, run };
}

function audience(permissions: readonly string[]) {
  return canViewRecommendationEvaluationAudit(permissions)
    ? ("audit" as const)
    : ("workspace" as const);
}

function failure(error: unknown) {
  if (error instanceof IdentityError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof AnalysisServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationPortfolioServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-portfolio-api]", error);
  return json(
    {
      error: "Recommendation portfolio publication failed safely.",
      code: "PORTFOLIO_PUBLICATION_FAILED",
    },
    500,
  );
}

function response(
  request: Request,
  record: Awaited<ReturnType<typeof recommendationPortfolioService.getForRun>> extends infer Value
    ? NonNullable<Value>
    : never,
  projectionAudience: "workspace" | "audit",
  status = 200,
) {
  const etag = recommendationPortfolioEtag(record);
  if (recommendationPortfolioEtagMatches(request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: {
        etag,
        "cache-control": "private, no-cache, max-age=0",
        vary: "cookie, authorization",
      },
    });
  }
  return json(projectRecommendationPortfolio(record, projectionAudience), status, { etag });
}

export async function getRecommendationPortfolioForRun(request: Request, runId: string) {
  try {
    const { verified, run } = await runContext(request, runId);
    const portfolio = await recommendationPortfolioService.getForRun(run);
    if (!portfolio) {
      return json(
        {
          error: "Recommendation portfolio is unavailable.",
          code: "PORTFOLIO_PUBLICATION_FAILED",
        },
        404,
      );
    }
    return response(request, portfolio, audience(verified.identity.permissions));
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationPortfolio(request: Request, runId: string) {
  try {
    const { verified, run } = await runContext(request, runId);
    const result = await recommendationPortfolioService.ensure(run);
    return response(
      request,
      result.portfolio,
      audience(verified.identity.permissions),
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationPortfolioById(request: Request, portfolioId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const portfolio = await recommendationPortfolioService.getById(portfolioId, {
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
    });
    if (!portfolio) {
      return json(
        {
          error: "Recommendation portfolio is unavailable.",
          code: "RECOMMENDATION_ACCESS_DENIED",
        },
        404,
      );
    }
    return response(request, portfolio, audience(verified.identity.permissions));
  } catch (error) {
    return failure(error);
  }
}
