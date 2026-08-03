import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { assertDeliveryDnaActionAccess } from "../delivery-intelligence/commercial-access.server";
import { RecommendationExperienceError } from "./model";
import { recommendationExperienceService } from "./service.server";

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

function failure(error: unknown) {
  if (error instanceof IdentityError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof RecommendationExperienceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[recommendation-experience-api]", error);
  return json(
    {
      error: "The recommendation experience is temporarily unavailable. No data was changed.",
      code: "RECOMMENDATION_EXPERIENCE_INVALID",
    },
    500,
  );
}

function etagMatches(value: string | null, etag: string) {
  return Boolean(
    value
      ?.split(",")
      .map((candidate) => candidate.trim())
      .some((candidate) => candidate === etag || candidate === "*"),
  );
}

export async function getRecommendationExperience(request: Request, portfolioId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    await assertDeliveryDnaActionAccess({
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permitted: true,
    });
    const projection = await recommendationExperienceService.get({
      portfolioId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permissions: verified.identity.permissions,
    });
    const etag = `"${projection.snapshot.version}"`;
    if (etagMatches(request.headers.get("if-none-match"), etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          etag,
          "cache-control": "private, no-cache, max-age=0",
          vary: "cookie, authorization",
        },
      });
    }
    return json(projection, 200, { etag });
  } catch (error) {
    return failure(error);
  }
}
