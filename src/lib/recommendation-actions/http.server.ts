import { assessmentRequestContext } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";
import { assertPermission } from "@/lib/identity/service.server";
import { canViewRecommendationEvaluationAudit } from "@/lib/recommendation-evaluation/projection";
import { captureRecommendationAnalyticsSafely } from "@/lib/recommendation-analytics/service.server";

import { recommendationActionCommands } from "./model";
import { projectRecommendationAction } from "./projection";
import { recommendationActionService, RecommendationActionServiceError } from "./service.server";

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
  if (error instanceof IdentityError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof RecommendationActionServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-action-api]", error);
  return json(
    {
      error: "The improvement action could not be changed. No existing action data was lost.",
      code: "RECOMMENDATION_ACTION_INVALID",
    },
    500,
  );
}

function idempotencyKey(request: Request, body: Record<string, unknown>) {
  return (
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "") ||
    request.headers.get("idempotency-key")?.trim() ||
    ""
  );
}

function auditAllowed(permissions: readonly string[]) {
  return canViewRecommendationEvaluationAudit(permissions);
}

export async function getRecommendationAction(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const audit = auditAllowed(verified.identity.permissions);
    const result = await recommendationActionService.get(
      actionId,
      { organisationId: verified.organisationId, workspaceId: verified.workspaceId },
      audit,
    );
    return json(
      {
        ...projectRecommendationAction(result, audit ? "audit" : "workspace"),
        canManageAction: verified.identity.permissions.includes("workspace:manage"),
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationPortfolioActions(request: Request, portfolioId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const records = await recommendationActionService.list(portfolioId, {
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
    });
    return json(
      {
        portfolioId,
        canManageActions: verified.identity.permissions.includes("workspace:manage"),
        actions: records.map((record) => projectRecommendationAction(record, "workspace")),
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationAction(request: Request, portfolioItemId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "workspace:manage");
    const body = (await request.json()) as Record<string, unknown>;
    const expectedVersion = body.expectedVersion ?? 0;
    if (
      (body.portfolioItemId !== undefined && body.portfolioItemId !== portfolioItemId) ||
      (body.planVersion !== undefined && body.planVersion !== 1) ||
      expectedVersion !== 0
    ) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACTION_INVALID",
        400,
        "A valid improvement action request is required.",
      );
    }
    const result = await recommendationActionService.create({
      portfolioItemId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      planVersion: 1,
      expectedVersion: 0,
      idempotencyKey: idempotencyKey(request, body),
    });
    return json(projectRecommendationAction(result, "workspace"), 200);
  } catch (error) {
    return failure(error);
  }
}

export async function patchRecommendationAction(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "workspace:manage");
    const body = (await request.json()) as Record<string, unknown>;
    const command = body.command;
    if (
      typeof command !== "string" ||
      command === "created" ||
      !recommendationActionCommands.includes(command as never) ||
      !Number.isInteger(body.expectedVersion) ||
      (body.accountableOwnerId !== undefined &&
        body.accountableOwnerId !== null &&
        typeof body.accountableOwnerId !== "string") ||
      (body.contributorIds !== undefined &&
        (!Array.isArray(body.contributorIds) ||
          body.contributorIds.some((value) => typeof value !== "string"))) ||
      (body.evidenceReferences !== undefined &&
        (!Array.isArray(body.evidenceReferences) ||
          body.evidenceReferences.some((value) => typeof value !== "string")))
    ) {
      throw new RecommendationActionServiceError(
        "RECOMMENDATION_ACTION_INVALID",
        400,
        "A valid improvement action command is required.",
      );
    }
    for (const key of [
      "targetDate",
      "note",
      "completionNote",
      "evidenceNotAvailableReason",
      "dependencyOverrideReason",
    ]) {
      if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
        throw new RecommendationActionServiceError(
          "RECOMMENDATION_ACTION_INVALID",
          400,
          "Improvement action text and date fields must be strings.",
        );
      }
    }
    const result = await recommendationActionService.update({
      actionId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      command: command as "updated" | "started" | "blocked" | "completed" | "cancelled",
      expectedVersion: body.expectedVersion as number,
      idempotencyKey: idempotencyKey(request, body),
      accountableOwnerId: body.accountableOwnerId as string | null | undefined,
      contributorIds: body.contributorIds as string[] | undefined,
      targetDate: body.targetDate as string | null | undefined,
      note: body.note as string | null | undefined,
      completionNote: body.completionNote as string | null | undefined,
      evidenceReferences: body.evidenceReferences as string[] | undefined,
      evidenceNotAvailableReason: body.evidenceNotAvailableReason as string | null | undefined,
      dependencyOverride: body.dependencyOverride === true,
      dependencyOverrideReason: body.dependencyOverrideReason as string | null | undefined,
      dependencyOverrideAcknowledged: body.dependencyOverrideAcknowledged === true,
      cancelAcknowledged: body.cancelAcknowledged === true,
    });
    const analyticsEvent = {
      started: "action_started",
      blocked: "action_blocked",
      completed: "action_completed",
    }[command] as "action_started" | "action_blocked" | "action_completed" | undefined;
    if (analyticsEvent) {
      await captureRecommendationAnalyticsSafely({
        eventId: `action:${result.id}:${result.version}`,
        eventType: analyticsEvent,
        objectType: "action",
        objectId: result.id,
        objectVersion: String(result.version),
        mode: "workspace",
        properties: { action_state: result.status },
        occurredAt: result.updatedAt,
        organisationId: verified.organisationId,
        workspaceId: verified.workspaceId,
        actorUserId: verified.identity.user.id,
      });
    }
    return json(projectRecommendationAction(result, "workspace"), 200);
  } catch (error) {
    return failure(error);
  }
}
