import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { IdentityError } from "../identity/errors";
import { AnalysisServiceError } from "../analysis/service.server";
import { createPublicResult, readPublicResult } from "./public-service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });

export async function postPublicResult(request: Request, runId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    const body = (await request.json().catch(() => null)) as { consent?: unknown } | null;
    const created = await createPublicResult(
      runId,
      {
        ownerKey: verified.ownerKey,
        organisationId: verified.organisationId,
        workspaceId: verified.workspaceId,
        userId: verified.identity.user.id,
      },
      body?.consent === true,
    );
    return json(
      { id: created.id, url: `/public/results/${created.token}`, expiresAt: created.expiresAt },
      201,
    );
  } catch (error) {
    if (error instanceof IdentityError || error instanceof AnalysisServiceError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    const code =
      error instanceof Error ? error.message.split(":", 1)[0] : "ANALYSIS_EXECUTION_FAILED";
    const status =
      code === "ANALYSIS_INPUT_INVALID" ? 422 : code === "PUBLIC_RESULT_UNAVAILABLE" ? 404 : 500;
    return json(
      {
        error: status === 500 ? "Public result failed safely" : "Public result is unavailable",
        code,
      },
      status,
    );
  }
}

export async function getPublicResult(request: Request, token: string) {
  try {
    const address =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";
    const result = await readPublicResult(token, address);
    return result
      ? json(result, 200)
      : json({ error: "Public result is unavailable", code: "PUBLIC_RESULT_UNAVAILABLE" }, 404);
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_RATE_LIMITED") {
      return json({ error: "Public request limit reached", code: "PUBLIC_RATE_LIMITED" }, 429);
    }
    console.error("[public-result-api]", error);
    return json({ error: "Public result is unavailable", code: "PUBLIC_RESULT_UNAVAILABLE" }, 404);
  }
}
