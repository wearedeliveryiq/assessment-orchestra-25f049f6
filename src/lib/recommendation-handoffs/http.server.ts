import { assessmentRequestContext } from "@/lib/identity/assessment-auth.server";
import { IdentityError } from "@/lib/identity/errors";
import { assertPermission } from "@/lib/identity/service.server";

import { productHandoffCtas } from "./model";
import { projectProductHandoff } from "./projection";
import { productHandoffService, ProductHandoffServiceError } from "./service.server";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "cookie, authorization",
    },
  });

function failure(error: unknown) {
  if (error instanceof IdentityError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof ProductHandoffServiceError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error("[product-handoff-api]", error);
  return json(
    {
      error: "The secure hand-off is unavailable. No product was activated.",
      code: "PRODUCT_HANDOFF_INVALID",
    },
    500,
  );
}

function requestKey(request: Request, body: Record<string, unknown>) {
  return (
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "") ||
    request.headers.get("idempotency-key")?.trim() ||
    ""
  );
}

export async function getProductHandoffOpportunities(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request);
    assertPermission(verified.identity, "assessment:read");
    const opportunities = await productHandoffService.opportunities({
      actionId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      permissions: verified.identity.permissions,
    });
    return json({ actionId, opportunities }, 200);
  } catch (error) {
    return failure(error);
  }
}

export async function postProductHandoff(request: Request, actionId: string) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "assessment:read");
    const body = (await request.json()) as Record<string, unknown>;
    if (
      !["knowledge_pack", "teammate"].includes(String(body.targetType)) ||
      typeof body.targetId !== "string" ||
      typeof body.targetVersion !== "string" ||
      typeof body.cta !== "string" ||
      !productHandoffCtas.includes(body.cta as never) ||
      body.consentAcknowledged !== true
    ) {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_INVALID",
        400,
        "A valid hand-off target and explicit confirmation are required.",
      );
    }
    const result = await productHandoffService.create({
      actionId,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      permissions: verified.identity.permissions,
      targetType: body.targetType as "knowledge_pack" | "teammate",
      targetId: body.targetId.trim(),
      targetVersion: body.targetVersion.trim(),
      cta: body.cta as (typeof productHandoffCtas)[number],
      consentAcknowledged: true,
      idempotencyKey: requestKey(request, body),
    });
    return json({ handoff: projectProductHandoff(result.handoff), token: result.token }, 201);
  } catch (error) {
    return failure(error);
  }
}

export async function postConsumeProductHandoff(request: Request) {
  try {
    const verified = await assessmentRequestContext(request, { write: true });
    assertPermission(verified.identity, "assessment:read");
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.token !== "string") {
      throw new ProductHandoffServiceError(
        "PRODUCT_HANDOFF_INVALID",
        400,
        "A hand-off token is required.",
      );
    }
    const result = await productHandoffService.consume({
      token: body.token,
      organisationId: verified.organisationId,
      workspaceId: verified.workspaceId,
      actorUserId: verified.identity.user.id,
      permissions: verified.identity.permissions,
    });
    return json(
      {
        handoff: projectProductHandoff(result),
        contract: {
          purpose: result.cta,
          targetType: result.targetType,
          targetId: result.targetId,
          targetVersion: result.targetVersion,
          sourceActionId: result.sourceActionId,
        },
        activated: false,
        message: "Hand-off authorised. No product has been activated automatically.",
      },
      200,
    );
  } catch (error) {
    return failure(error);
  }
}
