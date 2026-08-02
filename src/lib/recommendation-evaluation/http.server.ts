import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { projectRecommendationEvaluation } from "./projection";
import {
  recommendationEvaluationService,
  RecommendationEvaluationServiceError,
} from "./service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-cache",
    },
  });

async function context(request: Request, runId: string) {
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

function failure(error: unknown) {
  if (error instanceof IdentityError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof AnalysisServiceError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof RecommendationEvaluationServiceError)
    return json({ error: error.message, code: error.code }, error.status);
  console.error("[recommendation-evaluation-api]", error);
  return json(
    {
      error: "Recommendation evaluation failed safely.",
      code: "RECOMMENDATION_EVALUATION_INVALID",
    },
    500,
  );
}

export async function getRecommendationEvaluation(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const evaluation = await recommendationEvaluationService.get(run);
    if (!evaluation) {
      return json(
        {
          error: "Recommendation evaluation is unavailable.",
          code: "RECOMMENDATION_EVALUATION_INVALID",
        },
        404,
      );
    }
    const canAudit =
      verified.identity.permissions.includes("audit:read") ||
      verified.identity.permissions.includes("recommendation:govern");
    return json(projectRecommendationEvaluation(evaluation, canAudit), 200);
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationEvaluation(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const result = await recommendationEvaluationService.evaluate(run);
    const canAudit =
      verified.identity.permissions.includes("audit:read") ||
      verified.identity.permissions.includes("recommendation:govern");
    return json(
      { ...projectRecommendationEvaluation(result.evaluation, canAudit), reused: result.reused },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}
