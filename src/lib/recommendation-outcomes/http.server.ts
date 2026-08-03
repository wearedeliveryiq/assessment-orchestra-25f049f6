import { assessmentRequestContext } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";
import { assertPermission } from "@/lib/identity/service.server";
import { canViewRecommendationEvaluationAudit } from "@/lib/recommendation-evaluation/projection";
import { captureRecommendationAnalyticsSafely } from "@/lib/recommendation-analytics/service.server";

import { projectRecommendationOutcome } from "./projection";
import { recommendationOutcomeService, RecommendationOutcomeServiceError } from "./service.server";
import { outcomeDirections, type OutcomeValue } from "./types";

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
  if (error instanceof RecommendationOutcomeServiceError)
    return json({ error: error.message, code: error.code }, error.status);
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("OUTCOME_"))
    return json({ error: "The outcome request is invalid.", code: message.split(":")[0] }, 400);
  console.error("[recommendation-outcome-api]", error);
  return json(
    {
      error: "Outcome measurement is temporarily unavailable. Existing evidence is unchanged.",
      code: "OUTCOME_SERVICE_UNAVAILABLE",
    },
    500,
  );
}

function text(body: Record<string, unknown>, key: string, required = false) {
  const value = body[key];
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`OUTCOME_CONFIGURATION_INVALID: ${key} is required`);
    return null;
  }
  if (typeof value !== "string") throw new Error(`OUTCOME_CONFIGURATION_INVALID: ${key}`);
  return value.trim();
}

function value(body: Record<string, unknown>, key: string): OutcomeValue | null {
  const candidate = body[key];
  if (candidate === null || candidate === undefined) return null;
  if (!candidate || typeof candidate !== "object")
    throw new Error(`OUTCOME_CONFIGURATION_INVALID: ${key}`);
  const row = candidate as Record<string, unknown>;
  if (row.kind === "binary" && typeof row.value === "boolean")
    return { kind: "binary", value: row.value };
  if (row.kind === "numeric" && typeof row.value === "string")
    return { kind: "numeric", value: row.value };
  throw new Error(`OUTCOME_CONFIGURATION_INVALID: ${key}`);
}

function requestKey(request: Request, body: Record<string, unknown>) {
  return (
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "") ||
    request.headers.get("idempotency-key")?.trim() ||
    ""
  );
}

export async function getRecommendationActionOutcome(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const result = await recommendationOutcomeService.getActionOutcome(actionId, {
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
    });
    if (!result) return json({ actionId, outcome: null }, 200);
    const audit = canViewRecommendationEvaluationAudit(verified.identity.permissions);
    return json(
      {
        outcome: projectRecommendationOutcome(
          result.outcome,
          result.records,
          audit ? "audit" : "workspace",
        ),
        canManageOutcome: verified.identity.permissions.includes("workspace:manage"),
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationActionOutcome(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "workspace:manage");
    const body = (await request.json()) as Record<string, unknown>;
    if (body.command === "retire") {
      if (typeof body.measureVersionId !== "string" || !Number.isInteger(body.expectedVersion))
        throw new Error("OUTCOME_CONFIGURATION_INVALID: retirement");
      const retired = await recommendationOutcomeService.retire({
        measureVersionId: body.measureVersionId,
        expectedVersion: body.expectedVersion as number,
        organisationId: verified.organisationId,
        workspaceId: verified.workspaceId,
        actorUserId: verified.identity.user.id,
        traceId: request.headers.get("x-correlation-id") ?? undefined,
      });
      return json(retired, 200);
    }
    const direction = text(body, "direction", true);
    if (!outcomeDirections.includes(direction as never))
      throw new Error("OUTCOME_CONFIGURATION_INVALID: direction");
    const decimalScale = body.decimalScale;
    const expectedVersion = body.expectedVersion;
    if (!Number.isInteger(decimalScale) || !Number.isInteger(expectedVersion))
      throw new Error("OUTCOME_CONFIGURATION_INVALID: version or scale");
    const record = await recommendationOutcomeService.configure({
      actionId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      measureId: text(body, "measureId") ?? undefined,
      expectedVersion: expectedVersion as number,
      direction: direction as (typeof outcomeDirections)[number],
      unit: text(body, "unit", true)!,
      decimalScale: decimalScale as number,
      baselineValue: value(body, "baselineValue"),
      baselineEffectiveAt: text(body, "baselineEffectiveAt"),
      targetValue: value(body, "targetValue"),
      tolerance: text(body, "tolerance"),
      targetDate: text(body, "targetDate"),
      targetTimezone: text(body, "targetTimezone"),
      sourceDescription: text(body, "sourceDescription", true)!,
      sourceReference: text(body, "sourceReference"),
      cadence: text(body, "cadence", true)!,
      accountableOwnerId: text(body, "accountableOwnerId", true)!,
      retire: body.retire === true,
      traceId: request.headers.get("x-correlation-id") ?? undefined,
    });
    return json(record, 200);
  } catch (error) {
    return failure(error);
  }
}

export async function getOutcomeObservations(request: Request, measureVersionId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const url = new URL(request.url);
    const requested = Number(url.searchParams.get("limit") ?? "100");
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 250) : 100;
    const result = await recommendationOutcomeService.observations(
      measureVersionId,
      { organisationId: verified.organisationId, workspaceId: verified.workspaceId },
      { limit, beforeRecordedAt: url.searchParams.get("before") ?? undefined },
    );
    const audit = canViewRecommendationEvaluationAudit(verified.identity.permissions);
    return json(
      {
        observations: result.items.map((item) =>
          audit
            ? item
            : {
                id: item.id,
                value: item.value,
                effectiveAt: item.effectiveAt,
                recordedAt: item.recordedAt,
                sourceDescription: item.sourceDescription,
                supersedesObservationId: item.supersedesObservationId,
                correctionReason: item.correctionReason,
              },
        ),
        nextCursor: result.nextCursor,
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postOutcomeObservation(request: Request, measureVersionId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "workspace:manage");
    const body = (await request.json()) as Record<string, unknown>;
    const observed = value(body, "value");
    if (!observed) throw new Error("OUTCOME_OBSERVATION_INVALID: value");
    const result = await recommendationOutcomeService.observe({
      measureVersionId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      value: observed,
      effectiveAt: text(body, "effectiveAt", true)!,
      sourceDescription: text(body, "sourceDescription", true)!,
      sourceReference: text(body, "sourceReference"),
      idempotencyKey: requestKey(request, body),
      supersedesObservationId: text(body, "supersedesObservationId"),
      correctionReason: text(body, "correctionReason"),
      traceId: request.headers.get("x-correlation-id") ?? undefined,
    });
    const latest = result.observations.at(-1);
    await captureRecommendationAnalyticsSafely({
      eventId: `outcome:${result.measure.id}:${result.history.at(-1)?.sequence ?? result.observations.length}`,
      eventType: "outcome_observed",
      objectType: "outcome",
      objectId: result.measure.outcomeId,
      objectVersion: String(result.measure.version),
      mode: "workspace",
      properties: {},
      occurredAt: latest?.recordedAt ?? new Date().toISOString(),
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
    });
    return json(result, 200);
  } catch (error) {
    return failure(error);
  }
}
