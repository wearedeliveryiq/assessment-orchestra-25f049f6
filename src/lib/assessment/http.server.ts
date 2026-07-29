import * as runtime from "./runtime.server";

export type Runtime = typeof runtime;

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
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return trimmed;
}

/**
 * Shared REST envelope: resolves the caller's owner key, invokes the runtime
 * controller and maps runtime errors onto HTTP status codes.
 */
export async function handleRoute(
  request: Request,
  fn: (rt: Runtime, ownerKey: string) => Promise<unknown>,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await fn(runtime, ownerKey));
  } catch (error) {
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
