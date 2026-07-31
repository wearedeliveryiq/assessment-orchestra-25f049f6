import type { AuthenticatedIdentity } from "@/lib/identity/types";

import { listOrganisations } from "./organisation.server";
import * as repo from "./repository.server";
import { listWorkspaces } from "./workspace.server";
import type { MemberView, TenantSearchResults } from "./types";
import { matches } from "./validation";

/**
 * TenantSearchService — partial-match search across the tenancy graph, always
 * scoped to the organisations the caller belongs to.
 */
export async function searchTenancy(
  identity: AuthenticatedIdentity,
  query: string,
  limit = 8,
): Promise<TenantSearchResults> {
  const term = query.trim();
  const [organisations, workspaces] = await Promise.all([
    listOrganisations(identity),
    listWorkspaces(identity, { includeArchived: true }),
  ]);

  const memberLists = await Promise.all(
    organisations.slice(0, 10).map((organisation) => repo.listOrganisationMembers(organisation.id)),
  );
  const members: MemberView[] = memberLists.flat();

  return {
    organisations: organisations
      .filter((organisation) => matches(`${organisation.name} ${organisation.industry}`, term))
      .slice(0, limit),
    workspaces: workspaces
      .filter((workspace) => matches(`${workspace.name} ${workspace.description}`, term))
      .slice(0, limit),
    members: members
      .filter((member) => matches(`${member.displayName} ${member.email}`, term))
      .slice(0, limit),
  };
}
