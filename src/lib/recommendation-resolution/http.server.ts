import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { assertDeliveryDnaActionAccess } from "../delivery-intelligence/commercial-access.server";
import {
  recommendationConfidenceGateService,
  RecommendationConfidenceGateServiceError,
} from "../recommendation-confidence/service.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import { projectRecommendationResolution } from "./projection";
import {
  recommendationResolutionService,
  RecommendationResolutionServiceError,
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
  await assertDeliveryDnaActionAccess({
    organisationId: verified.organisationId,
    workspaceId: verified.workspaceId,
    permitted: true,
  });
  return { verified, run };
}

function failure(error: unknown) {
  if (error instanceof IdentityError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof AnalysisServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationConfidenceGateServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationResolutionServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-resolution-api]", error);
  return json(
    {
      error: "Recommendation conflict resolution failed safely.",
      code: "RECOMMENDATION_RESOLUTION_INVALID",
    },
    500,
  );
}

export async function getRecommendationResolution(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const resolution = await recommendationResolutionService.get(run);
    if (!resolution) {
      return json(
        {
          error: "Resolved recommendation guidance is unavailable.",
          code: "RECOMMENDATION_RESOLUTION_INVALID",
        },
        404,
      );
    }
    const audience = canViewRecommendationEvaluationAudit(verified.identity.permissions)
      ? "audit"
      : "workspace";
    return json(projectRecommendationResolution(resolution, audience), 200);
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationResolution(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    await recommendationConfidenceGateService.evaluate(run);
    const result = await recommendationResolutionService.resolve(run);
    const audience = canViewRecommendationEvaluationAudit(verified.identity.permissions)
      ? "audit"
      : "workspace";
    return json(
      { ...projectRecommendationResolution(result.resolution, audience), reused: result.reused },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}
