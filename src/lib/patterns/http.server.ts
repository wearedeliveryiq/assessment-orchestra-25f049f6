import * as service from "./service.server";
import { assessmentOwnerId } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Shared REST envelope for the pattern APIs, mirroring the rule APIs. */
export async function handlePatternRoute(
  request: Request,
  fn: (svc: typeof service, ownerKey: string) => Promise<unknown>,
): Promise<Response> {
  try {
    const ownerKey = await assessmentOwnerId(request);
    return json(await fn(service, ownerKey));
  } catch (error) {
    if (error instanceof IdentityError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    if (error instanceof service.PatternServiceError) {
      return json({ error: error.message }, error.status);
    }
    console.error("[pattern-api]", error);
    return json({ error: "Pattern engine error" }, 500);
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new service.PatternServiceError("Invalid JSON body", 400);
  }
}
