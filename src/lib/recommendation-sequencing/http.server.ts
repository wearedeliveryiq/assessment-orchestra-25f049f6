import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import { projectRecommendationSequence } from "./projection";
import {
  recommendationSequenceService,
  RecommendationSequenceServiceError,
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
  return { verified, run };
}

function failure(error: unknown) {
  if (error instanceof IdentityError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof AnalysisServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationSequenceServiceError) {
    return json({ error: error.message, code: error.code, ...(error.details ?? {}) }, error.status);
  }
  console.error("[recommendation-sequence-api]", error);
  return json(
    {
      error: "Recommendation sequencing failed safely.",
      code: "RECOMMENDATION_SEQUENCE_INVALID",
    },
    500,
  );
}

function audience(permissions: readonly string[]) {
  return canViewRecommendationEvaluationAudit(permissions)
    ? ("audit" as const)
    : ("workspace" as const);
}

export async function getRecommendationSequence(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const sequence = await recommendationSequenceService.get(run);
    if (!sequence) {
      return json(
        {
          error: "Recommendation sequencing is unavailable.",
          code: "RECOMMENDATION_SEQUENCE_INVALID",
        },
        404,
      );
    }
    return json(
      projectRecommendationSequence(sequence, audience(verified.identity.permissions)),
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationSequence(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId);
    const result = await recommendationSequenceService.ensure(run);
    return json(
      {
        ...projectRecommendationSequence(result.sequence, audience(verified.identity.permissions)),
        reused: result.reused,
      },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function putRecommendationSequenceOverride(request: Request, runId: string) {
  try {
    const { verified, run } = await context(request, runId, true);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const body = (await request.json()) as {
      orderedRecommendationIds?: unknown;
      expectedVersion?: unknown;
      reason?: unknown;
      acknowledgedRisk?: unknown;
    };
    if (
      !Array.isArray(body.orderedRecommendationIds) ||
      body.orderedRecommendationIds.some((item) => typeof item !== "string") ||
      !Number.isInteger(body.expectedVersion) ||
      typeof body.reason !== "string" ||
      body.acknowledgedRisk !== true
    ) {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        400,
        "A complete sequence, reason, risk acknowledgement and expected version are required.",
      );
    }
    const result = await recommendationSequenceService.setOverride(run, {
      orderedRecommendationIds: body.orderedRecommendationIds as string[],
      expectedVersion: body.expectedVersion as number,
      reason: body.reason,
      acknowledgedRisk: true,
      idempotencyKey,
      actorUserId: verified.identity.user.id,
    });
    return json(
      projectRecommendationSequence(result.sequence, audience(verified.identity.permissions)),
      200,
    );
  } catch (error) {
    return failure(error);
  }
}
