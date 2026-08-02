import { identityFromRequest } from "./authentication.server";

/**
 * Resolves the authenticated owner used by legacy assessment repositories.
 * The database column remains named `owner_key` during the tenancy migration,
 * but it now contains a verified user id rather than a browser-generated key.
 */
export async function assessmentOwnerId(request: Request): Promise<string> {
  const identity = await identityFromRequest(request);
  return identity.user.id;
}
