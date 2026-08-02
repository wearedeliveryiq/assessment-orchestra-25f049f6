import { z } from "zod";
import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import {
  AnalysisServiceError,
  assessmentAnalysisService,
  type AnalysisTenantContext,
} from "./service.server";

const requestSchema = z.object({
  assessmentId: z.string().uuid(),
  requestedMode: z.enum(["workspace", "public"]),
  idempotencyKey: z.string().min(16).max(256).optional(),
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, private",
      ...headers,
    },
  });

async function context(request: Request, write: boolean): Promise<AnalysisTenantContext> {
  const verified = await assessmentRequestContext(request, { write });
  return {
    ownerKey: verified.ownerKey,
    organisationId: verified.organisationId,
    workspaceId: verified.workspaceId,
    userId: verified.identity.user.id,
    correlationId: request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
  };
}

async function safe(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof AnalysisServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[analysis-api]", error);
    return json(
      { error: "Analysis request failed safely", code: "ANALYSIS_EXECUTION_FAILED" },
      500,
    );
  }
}

export function postAnalysisRun(request: Request): Promise<Response> {
  return safe(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success)
      return json({ error: "Invalid analysis request", code: "ANALYSIS_INPUT_INVALID" }, 422);
    const result = await assessmentAnalysisService.request(
      parsed.data,
      await context(request, true),
    );
    const location = `/api/analysis-runs/${result.run.id}`;
    return json(
      { id: result.run.id, status: result.run.status, location, reused: result.reused },
      result.httpStatus,
      { location },
    );
  });
}

export function getAnalysisRun(request: Request, runId: string): Promise<Response> {
  return safe(async () => {
    const run = await assessmentAnalysisService.get(runId, await context(request, false));
    return json({
      id: run.id,
      status: run.status,
      attempt: run.attempt,
      assessmentId: run.assessmentSessionId,
      assessmentRevision: run.assessmentRevision,
      requestedMode: run.requestedMode,
      configurationSetId: run.configurationSetId,
      queuedAt: run.queuedAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      failedAt: run.failedAt,
      error: run.errorCode
        ? { code: run.errorCode, message: run.safeErrorMessage, retryable: run.retryable }
        : null,
    });
  });
}

export const analysisApi = assessmentAnalysisService;
