import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { assertDeliveryDnaActionAccess } from "../delivery-intelligence/commercial-access.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import { recommendationResolutionService } from "../recommendation-resolution/service.server";
import { projectRecommendationPriority } from "./projection";
import {
  recommendationPriorityService,
  RecommendationPriorityServiceError,
} from "./service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function context(request: Request, runId: string, write = false) {
  const verified = await assessmentRequestContext(request, { write });
  assertPermission(verified.identity, write ? "assessment:submit" : "assessment:read");
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
  if (error instanceof RecommendationPriorityServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-priority-api]", error);
  return json(
    {
      error: "Recommendation prioritisation failed safely.",
      code: "RECOMMENDATION_PRIORITY_INVALID",
    },
    500,
  );
}

function audience(permissions: readonly string[]) {
  return canViewRecommendationEvaluationAudit(permissions)
    ? ("audit" as const)
    : ("workspace" as const);
}

export async function getRecommendationPriority(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const priority = await recommendationPriorityService.get(run);
    if (!priority) {
      return json(
        {
          error: "Prioritised recommendation guidance is unavailable.",
          code: "RECOMMENDATION_PRIORITY_INVALID",
        },
        404,
      );
    }
    return json(
      projectRecommendationPriority(priority, audience(verified.identity.permissions)),
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationPriority(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    await recommendationResolutionService.resolve(run);
    const result = await recommendationPriorityService.prioritise(run);
    return json(
      {
        ...projectRecommendationPriority(result.priority, audience(verified.identity.permissions)),
        reused: result.reused,
      },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function putRecommendationPriorityPreference(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId, true);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const body = (await request.json()) as {
      orderedRecommendationIds?: unknown;
      expectedVersion?: unknown;
    };
    if (
      !Array.isArray(body.orderedRecommendationIds) ||
      body.orderedRecommendationIds.some((item) => typeof item !== "string") ||
      !Number.isInteger(body.expectedVersion)
    ) {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        400,
        "A complete recommendation order and expected version are required.",
      );
    }
    const result = await recommendationPriorityService.setDisplayPreference(run, {
      orderedRecommendationIds: body.orderedRecommendationIds as string[],
      expectedVersion: body.expectedVersion as number,
      idempotencyKey,
      actorUserId: verified.identity.user.id,
    });
    return json(
      projectRecommendationPriority(result.priority, audience(verified.identity.permissions)),
      200,
    );
  } catch (error) {
    return failure(error);
  }
}
