import { assessmentAnalysisService, AnalysisServiceError } from "../analysis/service.server";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { explainConclusion } from "./explainability";
import { getTrace } from "./trace-repository.server";

const response = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });

export async function getExplanation(request: Request, runId: string): Promise<Response> {
  try {
    const verified = await assessmentRequestContext(request);
    const conclusionId = new URL(request.url).searchParams.get("conclusionId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(conclusionId)) {
      return response(
        { error: "A valid conclusion ID is required", code: "ANALYSIS_INPUT_INVALID" },
        422,
      );
    }
    const tenant = { organisationId: verified.organisationId, workspaceId: verified.workspaceId };
    await assessmentAnalysisService.get(runId, {
      ...tenant,
      ownerKey: verified.ownerKey,
      userId: verified.identity.user.id,
    });
    const explanation = explainConclusion(await getTrace(runId, tenant), conclusionId, {
      canAuditEvidence: verified.identity.permissions.includes("audit:read"),
    });
    if (!explanation) {
      return response(
        { error: "Explanation is not available", code: "ANALYSIS_ACCESS_DENIED" },
        404,
      );
    }
    return response(explanation, 200);
  } catch (error) {
    if (error instanceof IdentityError)
      return response({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return response({ error: error.message, code: error.code }, error.status);
    console.error("[explainability-api]", error);
    return response({ error: "Explanation failed safely", code: "ANALYSIS_EXECUTION_FAILED" }, 500);
  }
}
