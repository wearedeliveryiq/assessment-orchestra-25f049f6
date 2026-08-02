import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { getResult } from "./result-repository.server";
import { acceptRecommendation } from "./product-recommendations.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function postRecommendationAcceptance(
  request: Request,
  runId: string,
  recommendationId: string,
) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    const context = {
      ownerKey: verified.ownerKey,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      userId: verified.identity.user.id,
    };
    const run = await assessmentAnalysisService.get(runId, context);
    if (run.status !== "completed")
      return json({ error: "Only completed analysis recommendations can be accepted." }, 409);
    const result = await getResult(runId, context);
    const eligible = result?.canonicalResult.recommendations.ranked.some(
      (item) => item.id === recommendationId,
    );
    if (!eligible) return json({ error: "Recommendation is not available." }, 404);
    await acceptRecommendation({
      analysisRunId: runId,
      organisationId: context.organisationId,
      workspaceId: context.workspaceId,
      recommendationId,
      userId: context.userId,
    });
    return json({ analysisRunId: runId, recommendationId, status: "accepted" }, 200);
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[recommendation-acceptance-api]", error);
    return json({ error: "Recommendation acceptance failed safely." }, 500);
  }
}
