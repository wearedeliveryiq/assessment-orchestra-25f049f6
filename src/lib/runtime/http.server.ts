import { assessmentRuntime, listAssessments, RuntimeError } from "./service.server";

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

function ownerKeyOf(request: Request): string | null {
  const header = request.headers.get("x-owner-key");
  if (!header) return null;
  const trimmed = header.trim();
  return trimmed.length >= 8 && trimmed.length <= 128 ? trimmed : null;
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
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await fn({ runtime: assessmentRuntime, catalogue: listAssessments }, ownerKey));
  } catch (error) {
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
