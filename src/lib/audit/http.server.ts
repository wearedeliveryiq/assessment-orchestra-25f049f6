import {
  AuditServiceError,
  buildDashboard,
  getEventById,
  listEvents,
  auditHealth,
} from "./service.server";
import { explainEntity, getDecisionTrace, getEvidence, getSessionGraph } from "./explainability.server";
import { applyRetention, listRetentionPolicies, saveRetentionPolicy } from "./retention.server";
import { isEvidenceEntityType, type AuditQuery, type EvidenceEntityType } from "./types";
import { identityFromRequest } from "@/lib/identity/authentication.server";
import { IdentityError } from "@/lib/identity/errors";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

/**
 * REST adapter for the Audit & Explainability APIs. Access is permission
 * controlled through the workspace owner key, and organisation data is
 * isolated: session-scoped reads verify ownership before any data is returned.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function failure(error: unknown): Response {
  if (error instanceof IdentityError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof AuditServiceError) return json({ error: error.message }, error.status);
  console.error("[audit-api]", error);
  return json({ error: "Audit service error" }, 500);
}

async function guarded(
  request: Request,
  fn: (ownerKey: string, url: URL, identity: AuthenticatedIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    const identity = await identityFromRequest(request);
    return json(await fn(identity.user.id, new URL(request.url), identity));
  } catch (error) {
    return failure(error);
  }
}

export function parseAuditQuery(url: URL): AuditQuery {
  const params = url.searchParams;
  const number = (key: string) => {
    const raw = params.get(key);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const text = (key: string) => params.get(key) ?? undefined;

  return {
    assessmentSessionId: text("assessmentId"),
    organisationId: text("organisationId"),
    knowledgePackId: text("knowledgePackId"),
    engine: text("engine"),
    eventType: text("eventType"),
    entityType: text("entityType"),
    entityId: text("entityId"),
    userId: text("userId"),
    correlationId: text("correlationId"),
    severity: text("severity"),
    from: text("from"),
    to: text("to"),
    search: text("search"),
    includeArchived: params.get("includeArchived") === "true",
    limit: number("limit"),
    offset: number("offset"),
  };
}

function entityTypeOf(value: string): EvidenceEntityType {
  if (!isEvidenceEntityType(value)) {
    throw new AuditServiceError(`Unsupported entity type "${value}"`, 400);
  }
  return value;
}

/** GET /audit/{assessmentId} */
export function handleAssessmentAudit(request: Request, assessmentId: string): Promise<Response> {
  return guarded(request, (ownerKey, url) =>
    listEvents({ ...parseAuditQuery(url), assessmentSessionId: assessmentId }, ownerKey),
  );
}

/** GET /audit/events */
export function handleAuditEvents(request: Request): Promise<Response> {
  return guarded(request, (ownerKey, url) => listEvents(parseAuditQuery(url), ownerKey));
}

/** GET /audit/event/{id} */
export function handleAuditEvent(request: Request, id: string): Promise<Response> {
  return guarded(request, async (ownerKey) => ({ event: await getEventById(id, ownerKey) }));
}

/** GET /audit/dashboard */
export function handleAuditDashboard(request: Request): Promise<Response> {
  return guarded(request, (ownerKey, url) =>
    buildDashboard(
      {
        organisationId: url.searchParams.get("organisationId") ?? undefined,
        assessmentSessionId: url.searchParams.get("assessmentId") ?? undefined,
        knowledgePackId: url.searchParams.get("knowledgePackId") ?? undefined,
        userId: url.searchParams.get("userId") ?? undefined,
        engine: url.searchParams.get("engine") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      },
      ownerKey,
    ),
  );
}

/** GET /audit/health */
export function handleAuditHealth(request: Request): Promise<Response> {
  return guarded(request, async () => ({ health: auditHealth() }));
}

/** GET /evidence/{entityType}/{entityId} */
export function handleEvidence(
  request: Request,
  entityType: string,
  entityId: string,
): Promise<Response> {
  return guarded(request, (ownerKey, url) =>
    getEvidence(
      entityTypeOf(entityType),
      entityId,
      ownerKey,
      url.searchParams.get("assessmentId") ?? undefined,
    ),
  );
}

/** GET /trace/{entityType}/{entityId} */
export function handleTrace(
  request: Request,
  entityType: string,
  entityId: string,
): Promise<Response> {
  return guarded(request, (ownerKey, url) =>
    getDecisionTrace(entityTypeOf(entityType), entityId, ownerKey, {
      direction: url.searchParams.get("direction") === "downstream" ? "downstream" : "upstream",
      assessmentId: url.searchParams.get("assessmentId") ?? undefined,
    }),
  );
}

/** GET /explain/{entityType}/{entityId} */
export function handleExplain(
  request: Request,
  entityType: string,
  entityId: string,
): Promise<Response> {
  return guarded(request, (ownerKey, url) =>
    explainEntity(entityTypeOf(entityType), entityId, ownerKey, {
      assessmentId: url.searchParams.get("assessmentId") ?? undefined,
      question: url.searchParams.get("question") ?? undefined,
    }),
  );
}

/** GET /assessment/{id}/evidence-graph */
export function handleEvidenceGraph(request: Request, assessmentId: string): Promise<Response> {
  return guarded(request, (ownerKey) => getSessionGraph(assessmentId, ownerKey));
}

/** GET|POST|PUT /audit/retention */
export function handleRetention(request: Request): Promise<Response> {
  return guarded(request, async (ownerKey, _url, identity) => {
    if (request.method === "GET") return { policies: await listRetentionPolicies() };
    if (!identity.roles.includes("platform_admin")) {
      throw new IdentityError(
        "forbidden",
        "Only platform administrators can change or apply retention policies.",
        403,
      );
    }
    if (request.method === "POST") {
      const result = await applyRetention();
      console.info(`[audit-retention] applied by ${ownerKey}`, result);
      return result;
    }
    const body = (await request.json().catch(() => null)) as
      | Parameters<typeof saveRetentionPolicy>[0]
      | null;
    if (!body?.name || !body?.mode) {
      throw new AuditServiceError("A retention policy requires a name and mode", 400);
    }
    return { policy: await saveRetentionPolicy(body) };
  });
}
