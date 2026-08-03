import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError } from "./service.server";
import { analysisHandoffService } from "./handoff-service.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, private",
    },
  });
}

async function safe(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[analysis-handoff-api]", error);
    return json(
      {
        error: "We couldn't prepare your Delivery Intelligence. Your assessment is safe.",
        code: "ANALYSIS_HANDOFF_FAILED",
      },
      503,
    );
  }
}

function contextOf(verified: Awaited<ReturnType<typeof assessmentRequestContext>>) {
  return {
    ownerKey: verified.ownerKey,
    organisationId: verified.organisationId,
    workspaceId: verified.workspaceId,
    userId: verified.identity.user.id,
  };
}

export function getAnalysisHandoffStatus(request: Request, assessmentId: string) {
  return safe(async () => {
    const context = contextOf(await assessmentRequestContext(request));
    let current = await analysisHandoffService.view(assessmentId, context);
    if (current.state === "preparing" || current.state === "missing") {
      await analysisHandoffService.processAssessmentCompletion(assessmentId, context, {
        reclaimProcessing: true,
      });
      current = await analysisHandoffService.view(assessmentId, context);
    }
    if (current.state === "queued" || current.state === "running") {
      await analysisHandoffService.driveLatestRun(assessmentId, context);
    }
    return json(await analysisHandoffService.view(assessmentId, context));
  });
}

export function postAnalysisHandoffRetry(request: Request, assessmentId: string) {
  return safe(async () => {
    const verified = await assessmentRequestContext(request, { write: true });
    const run = await analysisHandoffService.requestRetry(assessmentId, contextOf(verified));
    return json({ id: run.id, status: run.status }, run.status === "completed" ? 200 : 202);
  });
}
