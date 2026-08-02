import { identityFromRequest } from "./authentication.server";
import { IdentityError } from "./errors";
import type { AuthenticatedIdentity } from "./types";
import { requireWorkspace } from "@/lib/tenancy/access.server";

export interface AssessmentRequestContext {
  identity: AuthenticatedIdentity;
  ownerKey: string;
  organisationId: string;
  workspaceId: string;
}

/** Resolves and verifies the explicit tenant scope on an assessment request. */
export async function assessmentRequestContext(
  request: Request,
  options: { write?: boolean } = {},
): Promise<AssessmentRequestContext> {
  const identity = await identityFromRequest(request);
  const organisationId = request.headers.get("x-organisation-id")?.trim() ?? "";
  const workspaceId = request.headers.get("x-workspace-id")?.trim() ?? "";
  if (!organisationId || !workspaceId) {
    throw new IdentityError(
      "tenant_required",
      "Select an organisation workspace before using assessments.",
      400,
    );
  }
  const access = await requireWorkspace(identity, workspaceId, options);
  if (access.workspace.organisationId !== organisationId) {
    throw new IdentityError("tenant_mismatch", "The selected workspace is not available.", 404);
  }
  return {
    identity,
    organisationId,
    workspaceId,
    ownerKey: `${identity.user.id}:${workspaceId}`,
  };
}

/**
 * Resolves the authenticated owner used by legacy assessment repositories.
 * The database column remains named `owner_key` during the tenancy migration,
 * but it now contains a verified user id rather than a browser-generated key.
 */
export async function assessmentOwnerId(request: Request): Promise<string> {
  return (await assessmentRequestContext(request)).ownerKey;
}
