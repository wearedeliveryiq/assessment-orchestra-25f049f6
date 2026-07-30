import * as orchestrator from "./service.server";
import { OrchestratorError, type ExecutionHistoryFilters, type ExecutionMode } from "./types";

export type Orchestrator = typeof orchestrator;

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

/** Shared REST envelope for every orchestrator endpoint. */
export async function handleRoute(
  request: Request,
  fn: (api: Orchestrator, ownerKey: string) => Promise<unknown>,
): Promise<Response> {
  const ownerKey = ownerKeyOf(request);
  if (!ownerKey) return json({ error: "Missing or invalid x-owner-key header" }, 401);

  try {
    return json(await fn(orchestrator, ownerKey));
  } catch (error) {
    if (error instanceof OrchestratorError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error("[orchestrator-api]", error);
    return json({ error: "Runtime orchestrator error" }, 500);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new OrchestratorError("Invalid JSON body", 400, "invalid_body");
  }
}

const MODES: ExecutionMode[] = ["manual", "scheduled", "batch", "triggered"];

export function parseMode(value: unknown): ExecutionMode {
  return MODES.includes(value as ExecutionMode) ? (value as ExecutionMode) : "manual";
}

export function parseHistoryFilters(request: Request, ownerKey: string): ExecutionHistoryFilters {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  return {
    ownerKey,
    status: (url.searchParams.get("status") as ExecutionHistoryFilters["status"]) ?? undefined,
    organisationName: url.searchParams.get("organisation") ?? undefined,
    knowledgePackId: url.searchParams.get("knowledgePack") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a path id before it reaches the database (avoids 500s on `undefined`). */
export function requireUuid(value: string | undefined, label = "id"): string {
  if (!value || !UUID_RE.test(value)) {
    throw new OrchestratorError(`Invalid ${label}`, 400, "invalid_id");
  }
  return value;
}
