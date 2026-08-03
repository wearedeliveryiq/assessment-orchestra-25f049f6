import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { RecommendationAnalyticsError } from "./model";
import { recommendationAnalyticsService } from "./service.server";

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
  if (error instanceof RecommendationAnalyticsError)
    return json({ error: error.message, code: error.code }, error.status);
  console.error("[recommendation-analytics-api]", error);
  return json(
    {
      error: "Analytics is temporarily unavailable. Your DeliveryIQ work was not affected.",
      code: "RECOMMENDATION_ANALYTICS_UNAVAILABLE",
    },
    500,
  );
}

export async function getRecommendationAnalyticsConsent(request: Request) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const consent = await recommendationAnalyticsService.consent(
      verified.organisationId,
      verified.identity.user.id,
    );
    return json(
      {
        status: consent?.status ?? "not_set",
        version: consent?.version ?? 0,
        occurredAt: consent?.occurredAt ?? null,
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationAnalyticsConsent(request: Request) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "assessment:read");
    const body = (await request.json()) as Record<string, unknown>;
    const status = body.status;
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (status !== "granted" && status !== "withdrawn") {
      throw new RecommendationAnalyticsError(
        "RECOMMENDATION_ANALYTICS_CONSENT_INVALID",
        400,
        "Choose whether to share privacy-safe usage signals.",
      );
    }
    const consent = await recommendationAnalyticsService.setConsent({
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      userId: verified.identity.user.id,
      status,
      idempotencyKey,
    });
    return json(
      { status: consent.status, version: consent.version, occurredAt: consent.occurredAt },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationAnalyticsEvent(request: Request) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "assessment:read");
    const body = (await request.json()) as Record<string, unknown>;
    const result = await recommendationAnalyticsService.capture({
      eventId: body.eventId,
      eventType: body.eventType,
      objectType: body.objectType,
      objectId: body.objectId,
      objectVersion: body.objectVersion,
      mode: body.mode,
      properties: body.properties,
      occurredAt: body.occurredAt,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
    });
    return json({ recorded: result.recorded, reason: result.reason ?? null }, 202);
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationAnalyticsAggregate(request: Request) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "recommendation:govern");
    const url = new URL(request.url);
    const to = url.searchParams.get("to") ?? new Date().toISOString();
    const from =
      url.searchParams.get("from") ??
      new Date(Date.parse(to) - 30 * 24 * 60 * 60 * 1000).toISOString();
    return json(await recommendationAnalyticsService.aggregate(from, to), 200);
  } catch (error) {
    return failure(error);
  }
}
