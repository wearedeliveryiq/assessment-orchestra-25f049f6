import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { getResult } from "./result-repository.server";
import { projectWorkspaceResult } from "./projection";
import { resolveProductRecommendations } from "./product-recommendations.server";
import { getTrace } from "./trace-repository.server";

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-cache",
      ...headers,
    },
  });

export async function getWorkspaceResult(request: Request, runId: string): Promise<Response> {
  try {
    const verified = await assessmentRequestContext(request);
    const context = {
      ownerKey: verified.ownerKey,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      userId: verified.identity.user.id,
    };
    const run = await assessmentAnalysisService.get(runId, context);
    if (run.status === "queued" || run.status === "running") {
      return json({ analysisRunId: run.id, status: run.status, result: null }, 202);
    }
    if (run.status === "failed") {
      return json(
        {
          analysisRunId: run.id,
          status: run.status,
          error: { code: run.errorCode, message: run.safeErrorMessage, retryable: run.retryable },
        },
        409,
      );
    }
    const stored = await getResult(run.id, {
      organisationId: context.organisationId,
      workspaceId: context.workspaceId,
    });
    if (!stored) {
      return json(
        { error: "Completed analysis result is unavailable", code: "ANALYSIS_EXECUTION_FAILED" },
        500,
      );
    }
    const etag = `"${stored.resultHash}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": "private, no-cache" },
      });
    }
    const projected = projectWorkspaceResult(stored);
    const productRecommendations = await resolveProductRecommendations({
      analysisRunId: run.id,
      organisationId: context.organisationId,
      workspaceId: context.workspaceId,
      recommendationIds: projected.recommendations.map((item) => item.id),
      permissions: verified.identity.permissions,
    });
    const trace = await getTrace(run.id, context);
    const explanations = trace.nodes
      .filter((node) => node.visible)
      .map((node) => ({ id: node.id, type: node.nodeType, domainId: node.domainId }));
    return json({ ...projected, productRecommendations, explanations }, 200, { etag });
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[intelligence-result-api]", error);
    return json(
      { error: "Intelligence result failed safely", code: "ANALYSIS_EXECUTION_FAILED" },
      500,
    );
  }
}

export async function getLatestWorkspaceResult(
  request: Request,
  assessmentId: string,
): Promise<Response> {
  try {
    const verified = await assessmentRequestContext(request);
    const run = await assessmentAnalysisService.latest(assessmentId, {
      ownerKey: verified.ownerKey,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      userId: verified.identity.user.id,
    });
    if (!run) return json({ analysisRunId: null, status: "empty", result: null }, 404);
    const target = new URL(request.url);
    target.pathname = `/api/analysis-runs/${run.id}/result`;
    return getWorkspaceResult(new Request(target, request), run.id);
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[latest-intelligence-result-api]", error);
    return json(
      { error: "Intelligence result failed safely", code: "ANALYSIS_EXECUTION_FAILED" },
      500,
    );
  }
}
