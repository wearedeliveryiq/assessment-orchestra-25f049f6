import { knowledgePackManager } from "./manager.server";
import { KnowledgePackError } from "./registry.server";

/**
 * Knowledge Pack Runtime HTTP layer.
 *
 * Read endpoints expose configuration only (no assessment data, no PII).
 * Mutating endpoints (activate, reload) are administrative and require an
 * admin key when one is configured for the environment.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function failure(error: unknown): Response {
  if (error instanceof KnowledgePackError) {
    return json({ error: error.message, packId: error.packId, issues: error.issues }, error.status);
  }
  console.error("[knowledge-pack-api]", error);
  return json({ error: "Knowledge Pack Runtime error" }, 500);
}

/**
 * Administrative authorisation. When `KNOWLEDGE_PACK_ADMIN_KEY` is configured
 * the caller must present it; otherwise mutations are limited to non-production
 * runtimes so a deployed environment can never be reconfigured anonymously.
 */
function authoriseAdmin(request: Request): { ok: true; actor: string } | { ok: false; response: Response } {
  const configured = process.env.KNOWLEDGE_PACK_ADMIN_KEY;
  const provided = request.headers.get("x-admin-key")?.trim();
  if (configured) {
    if (!provided || provided !== configured) {
      return { ok: false, response: json({ error: "Administrator key required" }, 401) };
    }
    return { ok: true, actor: "admin" };
  }
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      response: json(
        { error: "Knowledge Pack administration is disabled until KNOWLEDGE_PACK_ADMIN_KEY is configured" },
        403,
      ),
    };
  }
  return { ok: true, actor: "developer" };
}

function versionParam(request: Request): string | undefined {
  const value = new URL(request.url).searchParams.get("version");
  return value?.trim() ? value.trim() : undefined;
}

/** GET /knowledge-packs — installed packs, runtime info, cache stats, audit tail. */
export function handleListPacks(): Response {
  try {
    return json(knowledgePackManager.overview());
  } catch (error) {
    return failure(error);
  }
}

/** GET /knowledge-pack/{id}?version= — pack detail with validation report. */
export function handleGetPack(request: Request, packId: string): Response {
  try {
    return json(knowledgePackManager.detail(packId, versionParam(request)));
  } catch (error) {
    return failure(error);
  }
}

/** GET /knowledge-pack/{id}/versions — every discovered version of a pack. */
export function handleGetPackVersions(packId: string): Response {
  try {
    return json({ packId, versions: knowledgePackManager.versions(packId) });
  } catch (error) {
    return failure(error);
  }
}

/** POST /knowledge-packs/validate — revalidate one pack or the whole library. */
export async function handleValidatePacks(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { packId?: string; version?: string };
    const reports = knowledgePackManager.validate(body.packId, body.version);
    return json({
      reports,
      valid: reports.every((report) => report.valid),
    });
  } catch (error) {
    return failure(error);
  }
}

/** POST /knowledge-pack/{id}/activate — pin the runtime to a pack version. */
export async function handleActivatePack(request: Request, packId: string): Promise<Response> {
  const auth = authoriseAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json().catch(() => ({}))) as { version?: string };
    return json({ pack: knowledgePackManager.activate(packId, body.version, auth.actor) });
  } catch (error) {
    return failure(error);
  }
}

/** POST /knowledge-packs/reload — rediscover, revalidate and drop caches. */
export function handleReloadPacks(request: Request): Response {
  const auth = authoriseAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return json(knowledgePackManager.reload(auth.actor));
  } catch (error) {
    return failure(error);
  }
}
