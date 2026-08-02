import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { getResult } from "./result-repository.server";
import { projectWorkspaceResult } from "./projection";

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
    return json(projectWorkspaceResult(stored), 200, { etag });
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
