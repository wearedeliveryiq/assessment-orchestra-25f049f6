import { identityFromRequest } from "../identity/authentication.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import { recommendationCatalogueService, CatalogueServiceError } from "./service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function idempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim();
  if (!value || value.length > 160) {
    throw new CatalogueServiceError("CATALOGUE_VERSION_INVALID", 400, "Idempotency key required.");
  }
  return value;
}

export async function postCatalogueVersion(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    assertPermission(identity, "recommendation:govern");
    const result = await recommendationCatalogueService.createDraft(
      await request.json(),
      identity.user.id,
      idempotencyKey(request),
    );
    return json(result, result.reused ? 200 : 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof CatalogueServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[recommendation-catalogue-api]", error);
    return json({ error: "Catalogue operation failed safely." }, 500);
  }
}

export async function getCatalogueVersion(request: Request, id?: string) {
  try {
    const identity = await identityFromRequest(request);
    assertPermission(identity, "recommendation:govern");
    return json({ version: await recommendationCatalogueService.read(id) }, 200);
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof CatalogueServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[recommendation-catalogue-api]", error);
    return json({ error: "Catalogue operation failed safely." }, 500);
  }
}

export async function postCatalogueCommand(request: Request, id: string) {
  try {
    const identity = await identityFromRequest(request);
    assertPermission(identity, "recommendation:govern");
    const body = (await request.json()) as { command?: unknown };
    if (!["submit", "approve", "activate", "retire", "rollback"].includes(String(body.command))) {
      throw new CatalogueServiceError("CATALOGUE_VERSION_INVALID", 400, "Invalid command.");
    }
    const version = await recommendationCatalogueService.command(
      id,
      body.command as "submit" | "approve" | "activate" | "retire" | "rollback",
      identity.user.id,
      idempotencyKey(request),
    );
    return json({ version }, 200);
  } catch (error) {
    if (error instanceof IdentityError)
      return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof CatalogueServiceError)
      return json({ error: error.message, code: error.code }, error.status);
    console.error("[recommendation-catalogue-api]", error);
    return json({ error: "Catalogue operation failed safely." }, 500);
  }
}
