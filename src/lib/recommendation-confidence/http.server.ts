import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { assertDeliveryDnaActionAccess } from "../delivery-intelligence/commercial-access.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import {
  recommendationEvaluationService,
  RecommendationEvaluationServiceError,
} from "../recommendation-evaluation/service.server";
import { projectRecommendationConfidenceGate } from "./projection";
import {
  recommendationConfidenceGateService,
  RecommendationConfidenceGateServiceError,
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
  if (error instanceof RecommendationEvaluationServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationConfidenceGateServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-confidence-api]", error);
  return json(
    {
      error: "Recommendation confidence gating failed safely.",
      code: "RECOMMENDATION_EVALUATION_INVALID",
    },
    500,
  );
}

export async function getRecommendationConfidenceGate(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const gate = await recommendationConfidenceGateService.get(run);
    if (!gate) {
      return json(
        {
          error: "Recommendation confidence guidance is unavailable.",
          code: "RECOMMENDATION_EVALUATION_INVALID",
        },
        404,
      );
    }
    const audience = canViewRecommendationEvaluationAudit(verified.identity.permissions)
      ? "audit"
      : "workspace";
    return json(projectRecommendationConfidenceGate(gate, audience), 200);
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationConfidenceGate(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    await recommendationEvaluationService.evaluate(run);
    const result = await recommendationConfidenceGateService.evaluate(run);
    const audience = canViewRecommendationEvaluationAudit(verified.identity.permissions)
      ? "audit"
      : "workspace";
    return json(
      { ...projectRecommendationConfidenceGate(result.gate, audience), reused: result.reused },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}
