import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import {
  AnalysisServiceError,
  assessmentAnalysisService,
  type AnalysisTenantContext,
} from "./service.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function handleAnalysisRoute(
  request: Request,
  fn: (sessionId: string, context: AnalysisTenantContext) => Promise<unknown>,
  sessionId: string,
): Promise<Response> {
  try {
    const context = await assessmentRequestContext(request, { write: request.method !== "GET" });
    return json(
      await fn(sessionId, {
        ownerKey: context.ownerKey,
        organisationId: context.organisationId,
        workspaceId: context.workspaceId,
        userId: context.identity.user.id,
      }),
    );
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[analysis-api]", error);
    return json({ error: "Assessment analysis error", code: "analysis_failed" }, 500);
  }
}

export const analysisApi = assessmentAnalysisService;
