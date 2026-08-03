import { assessmentRequestContext } from "../identity/assessment-auth.server";
import { identityFromRequest } from "../identity/authentication.server";
import { IdentityError } from "../identity/errors";
import { assertPermission } from "../identity/service.server";
import type { AuthenticatedIdentity } from "../identity/types";
import { RecommendationGovernanceError } from "./model";
import { recommendationGovernanceService } from "./service.server";

const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "cookie, authorization",
      ...headers,
    },
  });

function failure(error: unknown) {
  if (error instanceof IdentityError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof RecommendationGovernanceError)
    return json({ error: error.message, code: error.code }, error.status);
  console.error("[recommendation-governance-api]", {
    error: error instanceof Error ? error.message : "unknown",
  });
  return json(
    {
      error: "Recommendation governance is temporarily unavailable.",
      code: "RECOMMENDATION_GOVERNANCE_UNAVAILABLE",
    },
    500,
  );
}

function canAuditTenant(identity: AuthenticatedIdentity, organisationId: string) {
  if (identity.permissions.includes("audit:read")) return true;
  return identity.memberships.some(
    (membership) =>
      membership.organisationId === organisationId &&
      membership.status === "active" &&
      ["organisation_owner", "org_admin"].includes(membership.role),
  );
}

function assertTenantAudit(identity: AuthenticatedIdentity, organisationId: string) {
  if (!canAuditTenant(identity, organisationId)) {
    throw new IdentityError(
      "forbidden",
      "You do not have permission to audit this workspace.",
      403,
    );
  }
}

function idempotencyKey(request: Request) {
  return request.headers.get("idempotency-key")?.trim() ?? "";
}

export async function postRecommendationAuditExport(request: Request) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertTenantAudit(verified.identity, verified.organisationId);
    const body = (await request.json()) as { portfolioId?: unknown };
    const job = await recommendationGovernanceService.requestExport({
      portfolioId: typeof body.portfolioId === "string" ? body.portfolioId : "",
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      requestedBy: verified.identity.user.id,
      idempotencyKey: idempotencyKey(request),
    });
    return json({ job: { ...job, payload: null } }, 202);
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationAuditExport(request: Request, id: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertTenantAudit(verified.identity, verified.organisationId);
    const download = new URL(request.url).searchParams.get("download") === "true";
    const job = await recommendationGovernanceService.getExport(
      id,
      { organisationId: verified.organisationId, workspaceId: verified.workspaceId },
      verified.identity.user.id,
      download,
    );
    if (!download) return json({ job });
    return json(job.payload, 200, {
      "content-disposition": `attachment; filename="deliveryiq-recommendation-audit-${id}.json"`,
      "x-content-type-options": "nosniff",
    });
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationAuditExportRetry(request: Request, id: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertTenantAudit(verified.identity, verified.organisationId);
    const job = await recommendationGovernanceService.retryExport(id, {
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
    });
    return json({ job: { ...job, payload: null } });
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationConfigurationDiff(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    assertPermission(identity, "recommendation:govern");
    const url = new URL(request.url);
    return json({
      diff: await recommendationGovernanceService.diffConfiguration(
        url.searchParams.get("from") ?? "",
        url.searchParams.get("to") ?? "",
      ),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function postRecommendationFeatureFlag(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    assertPermission(identity, "recommendation:govern");
    const body = (await request.json()) as Record<string, unknown>;
    if (
      body.featureKey !== "audit_exports" ||
      typeof body.enabled !== "boolean" ||
      !["release_gate", "incident", "rollback", "recovery"].includes(String(body.reasonCategory))
    ) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_FEATURE_FLAG_INVALID",
        400,
        "A valid feature-control request is required.",
      );
    }
    return json({
      feature: await recommendationGovernanceService.setFeatureFlag({
        featureKey: "audit_exports",
        enabled: body.enabled,
        actorId: identity.user.id,
        reasonCategory: body.reasonCategory as
          "release_gate" | "incident" | "rollback" | "recovery",
        idempotencyKey: idempotencyKey(request),
      }),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function getRecommendationOperationalHealth(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    if (
      !identity.permissions.includes("recommendation:govern") &&
      !identity.permissions.includes("audit:read")
    ) {
      throw new IdentityError("forbidden", "You do not have permission to view this health.", 403);
    }
    return json({ health: await recommendationGovernanceService.health() });
  } catch (error) {
    return failure(error);
  }
}
