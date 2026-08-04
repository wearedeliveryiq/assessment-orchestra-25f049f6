import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError, assessmentAnalysisService } from "../analysis/service.server";
import { getResult } from "./result-repository.server";
import { projectDeliveryDnaOverviewResult } from "./projection";
import { recommendationPortfolioService } from "../recommendation-portfolio/service.server";
import { resolveDeliveryDnaOverviewAccess } from "../delivery-dna/overview-access.server";

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
    // The complete governed portfolio is generated and persisted independently
    // of commercial tier. Access affects projection only, never calculation.
    const linkedAccess = await resolveDeliveryDnaOverviewAccess({
      assessmentId: run.assessmentSessionId,
      context: verified,
    });
    // Direct authenticated full-assessment starts and genuine pre-v1.1 results
    // remain available. Snapshot-linked assessments are governed by the scoped
    // Overview grant returned above.
    const access = linkedAccess ?? {
      assessmentId: run.assessmentSessionId,
      savedSnapshotId: "direct-assessment",
      access: "grandfathered" as const,
      permitted: true,
      offer: null,
      safeStatus: "available" as const,
    };
    if (!access.permitted) {
      return json(
        {
          error: "Unlock your Delivery DNA Overview to view this result.",
          code: "DELIVERY_DNA_OVERVIEW_REQUIRED",
        },
        403,
      );
    }
    const ensuredPortfolio = await recommendationPortfolioService.ensure(run);
    const portfolio = ensuredPortfolio.portfolio;
    const etag = `"${stored.resultHash}:PDR-003-004/1.1:${access.access}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": "private, no-cache" },
      });
    }
    return json(projectDeliveryDnaOverviewResult({ stored, portfolio, access }), 200, { etag });
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
