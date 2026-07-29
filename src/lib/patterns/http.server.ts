import * as service from "./service.server";

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

/** Shared REST envelope for the pattern APIs, mirroring the rule APIs. */
export async function handlePatternRoute(
  request: Request,
  fn: (svc: typeof service, ownerKey: string) => Promise<unknown>,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await fn(service, ownerKey));
  } catch (error) {
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
