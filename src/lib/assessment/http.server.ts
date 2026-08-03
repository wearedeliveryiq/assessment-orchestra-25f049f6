import * as runtime from "./runtime.server";
import {
  assessmentRequestContext,
  type AssessmentRequestContext,
} from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";

export type Runtime = typeof runtime;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Shared REST envelope: resolves the caller's verified identity, invokes the runtime
 * controller and maps runtime errors onto HTTP status codes.
 */
export async function handleRoute(
  request: Request,
  fn: (rt: Runtime, ownerKey: string, context: AssessmentRequestContext) => Promise<unknown>,
): Promise<Response> {
  try {
    const context = await assessmentRequestContext(request, { write: request.method !== "GET" });
    return json(await fn(runtime, context.ownerKey, context));
  } catch (error) {
    if (error instanceof IdentityError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    if (error instanceof runtime.RuntimeError) {
      return json({ error: error.message }, error.status);
    }
    console.error("[assessment-api]", error);
    return json({ error: "Assessment runtime error" }, 500);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new runtime.RuntimeError("Invalid JSON body", 400);
  }
}

export async function readOptionalJson<T>(request: Request, fallback: T): Promise<T> {
  const text = await request.text();
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new runtime.RuntimeError("Invalid JSON body", 400);
  }
}
