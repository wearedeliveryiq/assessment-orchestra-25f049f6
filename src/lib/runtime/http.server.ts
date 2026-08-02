import { assessmentRuntime, listAssessments, RuntimeError } from "./service.server";
import { assessmentOwnerId } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

export type RuntimeApi = {
  runtime: typeof assessmentRuntime;
  catalogue: typeof listAssessments;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Shared REST envelope for the Assessment Runtime: resolves the caller, invokes
 * the runtime and maps runtime failures onto clean HTTP responses while logging
 * detailed diagnostics server-side.
 */
export async function handleRuntimeRoute(
  request: Request,
  fn: (api: RuntimeApi, ownerKey: string) => Promise<unknown>,
): Promise<Response> {
  try {
    const ownerKey = await assessmentOwnerId(request);
    return json(await fn({ runtime: assessmentRuntime, catalogue: listAssessments }, ownerKey));
  } catch (error) {
    if (error instanceof IdentityError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    if (error instanceof RuntimeError) {
      return json({ error: error.message, details: error.details ?? null }, error.status);
    }
    console.error("[assessment-runtime-api]", error);
    return json({ error: "The assessment runtime encountered an unexpected error" }, 500);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RuntimeError("Invalid JSON body", 400);
  }
}
