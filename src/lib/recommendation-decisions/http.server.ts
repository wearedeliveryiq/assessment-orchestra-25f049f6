import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { assertDeliveryDnaActionAccess } from "../delivery-intelligence/commercial-access.server";
import { canViewRecommendationEvaluationAudit } from "../recommendation-evaluation/projection";
import { captureRecommendationAnalyticsSafely } from "../recommendation-analytics/service.server";
import {
  recommendationDecisionCommands,
  recommendationDecisionReasonCategories,
  type RecommendationDecisionReasonCategory,
} from "./model";
import { projectRecommendationDecision } from "./projection";
import {
  recommendationDecisionService,
  RecommendationDecisionServiceError,
} from "./service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "cookie, authorization",
    },
  });

function failure(error: unknown) {
  if (error instanceof IdentityError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof RecommendationDecisionServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-decision-api]", error);
  return json(
    {
      error: "The recommendation decision could not be recorded. No change was made.",
      code: "RECOMMENDATION_DECISION_INVALID",
    },
    500,
  );
}

function audience(permissions: readonly string[]) {
  return canViewRecommendationEvaluationAudit(permissions)
    ? ("audit" as const)
    : ("workspace" as const);
}

export async function getRecommendationDecision(request: Request, portfolioItemId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    await assertDeliveryDnaActionAccess({
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permitted: true,
    });
    const projectionAudience = audience(verified.identity.permissions);
    const result = await recommendationDecisionService.get(
      portfolioItemId,
      { organisationId: verified.organisationId, workspaceId: verified.workspaceId },
      projectionAudience === "audit",
    );
    return json(
      {
        ...projectRecommendationDecision(result, projectionAudience),
        canDecide: verified.identity.permissions.includes("assessment:submit"),
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationDecision(request: Request, portfolioItemId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "assessment:submit");
    await assertDeliveryDnaActionAccess({
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permitted: true,
    });
    const body = (await request.json()) as Record<string, unknown>;
    const command = body.decision;
    const reasonCategory = body.reasonCategory ?? null;
    const reviewAt = body.reviewAt ?? null;
    const idempotencyKey =
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null) ??
      request.headers.get("idempotency-key")?.trim() ??
      "";
    if (
      (body.portfolioItemId !== undefined && body.portfolioItemId !== portfolioItemId) ||
      typeof command !== "string" ||
      command === "superseded" ||
      !recommendationDecisionCommands.includes(command as never) ||
      !Number.isInteger(body.expectedVersion) ||
      (reasonCategory !== null &&
        (typeof reasonCategory !== "string" ||
          !recommendationDecisionReasonCategories.includes(reasonCategory as never))) ||
      (reviewAt !== null && typeof reviewAt !== "string") ||
      (body.acknowledged !== undefined && typeof body.acknowledged !== "boolean")
    ) {
      throw new RecommendationDecisionServiceError(
        "RECOMMENDATION_DECISION_INVALID",
        400,
        "A valid recommendation decision request is required.",
      );
    }
    const result = await recommendationDecisionService.decide({
      portfolioItemId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      command: command as "accepted" | "deferred" | "rejected" | "restored",
      expectedVersion: body.expectedVersion as number,
      idempotencyKey,
      acknowledged: body.acknowledged === true,
      reasonCategory: reasonCategory as RecommendationDecisionReasonCategory | null,
      reviewAt: reviewAt as string | null,
    });
    await captureRecommendationAnalyticsSafely({
      eventId: `decision:${result.id}:${result.version}`,
      eventType: "decision_recorded",
      objectType: "decision",
      objectId: result.id!,
      objectVersion: String(result.version),
      mode: "workspace",
      properties: { decision_state: result.currentState },
      occurredAt: result.updatedAt ?? new Date().toISOString(),
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
    });
    return json(
      {
        portfolioItemId: result.portfolioItemId,
        currentDecision: result.currentState,
        decisionVersion: result.version,
        reviewAt: result.reviewAt,
        reasonCategory: result.reasonCategory,
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationPortfolioDecisions(request: Request, portfolioId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    await assertDeliveryDnaActionAccess({
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permitted: true,
    });
    const projectionAudience = audience(verified.identity.permissions);
    const records = await recommendationDecisionService.list(
      portfolioId,
      { organisationId: verified.organisationId, workspaceId: verified.workspaceId },
      projectionAudience === "audit",
    );
    if (!records.length) {
      return json({ portfolioId, decisions: [] }, 200);
    }
    return json(
      {
        portfolioId,
        canDecide: verified.identity.permissions.includes("assessment:submit"),
        decisions: records.map((record) =>
          projectRecommendationDecision(record, projectionAudience),
        ),
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}
