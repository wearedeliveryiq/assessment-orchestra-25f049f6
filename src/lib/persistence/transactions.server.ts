import type { PlatformRepositories } from "./repositories";
import type { TenantContext } from "./types";
import { withTransaction } from "./unit-of-work";

/**
 * Transactional platform flows.
 *
 * Each flow spans several aggregates, so it runs inside a Unit of Work: every
 * write registers its compensating action and a failure at any point unwinds
 * the whole flow, leaving no orphan organisation, workspace or membership.
 *
 * Business rules (who may do this, which role is granted) stay in the domain
 * services — these functions only sequence the writes.
 */

export interface RegisterUserInput {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  organisationName?: string;
}

export async function registerUserTransaction(
  repos: PlatformRepositories,
  context: TenantContext,
  input: RegisterUserInput,
) {
  return withTransaction("register-user", async (uow) => {
    const user = await uow.step({
      name: "create-user-profile",
      run: () =>
        repos.users.create(context, {
          email: input.email.trim().toLowerCase(),
          firstName: input.firstName ?? "",
          lastName: input.lastName ?? "",
          displayName: input.displayName ?? input.email,
          status: "pending_verification",
          emailVerified: false,
        }),
      compensate: async (created) => {
        await repos.users.hardDeleteById({ ...context, crossTenant: true }, created.id);
      },
    });

    if (!input.organisationName) return { user, organisation: null, workspace: null };

    const created = await createOrganisationSteps(repos, context, uow, {
      name: input.organisationName,
      ownerId: user.id,
    });

    return { user, ...created };
  });
}

interface CreateOrganisationInput {
  name: string;
  ownerId: string;
  slug?: string;
  workspaceName?: string;
}

async function createOrganisationSteps(
  repos: PlatformRepositories,
  context: TenantContext,
  uow: { step: <T>(step: { name: string; run: () => Promise<T>; compensate?: (result: T) => Promise<void> }) => Promise<T> },
  input: CreateOrganisationInput,
) {
  const slug = input.slug ?? slugify(input.name);

  const organisation = await uow.step({
    name: "create-organisation",
    run: () => repos.organisations.create(context, { name: input.name, slug, status: "active" }),
    compensate: async (created) => {
      await repos.organisations.hardDeleteById({ ...context, crossTenant: true }, created.id);
    },
  });

  const scoped: TenantContext = { ...context, organisationId: organisation.id };

  await uow.step({
    name: "create-owner-membership",
    run: () =>
      repos.organisationMemberships.create(scoped, {
        organisationId: organisation.id,
        userId: input.ownerId,
        role: "organisation_owner",
        status: "active",
        joinedAt: new Date().toISOString(),
      }),
    compensate: async (created) => {
      await repos.organisationMemberships.hardDeleteById({ ...scoped, crossTenant: true }, created.id);
    },
  });

  const workspace = await uow.step({
    name: "create-default-workspace",
    run: () =>
      repos.workspaces.create(scoped, {
        organisationId: organisation.id,
        name: input.workspaceName ?? "General",
        slug: slugify(input.workspaceName ?? "general"),
        type: "general",
        status: "active",
        visibility: "organisation",
      }),
    compensate: async (created) => {
      await repos.workspaces.hardDeleteById({ ...scoped, crossTenant: true }, created.id);
    },
  });

  await uow.step({
    name: "create-workspace-membership",
    run: () =>
      repos.workspaceMemberships.create(scoped, {
        workspaceId: workspace.id,
        userId: input.ownerId,
        role: "workspace_manager",
        status: "active",
        joinedAt: new Date().toISOString(),
      }),
    compensate: async (created) => {
      await repos.workspaceMemberships.hardDeleteById({ ...scoped, crossTenant: true }, created.id);
    },
  });

  return { organisation, workspace };
}

export function createOrganisationTransaction(
  repos: PlatformRepositories,
  context: TenantContext,
  input: CreateOrganisationInput,
) {
  return withTransaction("create-organisation", (uow) =>
    createOrganisationSteps(repos, context, uow, input),
  );
}

export function createWorkspaceTransaction(
  repos: PlatformRepositories,
  context: TenantContext,
  input: { organisationId: string; name: string; ownerId: string; type?: string },
) {
  return withTransaction("create-workspace", async (uow) => {
    const workspace = await uow.step({
      name: "create-workspace",
      run: () =>
        repos.workspaces.create(context, {
          organisationId: input.organisationId,
          name: input.name,
          slug: slugify(input.name),
          type: input.type ?? "general",
          status: "active",
          visibility: "organisation",
        }),
      compensate: async (created) => {
        await repos.workspaces.hardDeleteById({ ...context, crossTenant: true }, created.id);
      },
    });

    await uow.step({
      name: "create-workspace-membership",
      run: () =>
        repos.workspaceMemberships.create(context, {
          workspaceId: workspace.id,
          userId: input.ownerId,
          role: "workspace_manager",
          status: "active",
          joinedAt: new Date().toISOString(),
        }),
      compensate: async (created) => {
        await repos.workspaceMemberships.hardDeleteById({ ...context, crossTenant: true }, created.id);
      },
    });

    return workspace;
  });
}

export function launchAssessmentTransaction(
  repos: PlatformRepositories,
  context: TenantContext,
  input: {
    organisationId: string;
    workspaceId: string;
    ownerKey: string;
    organisationName: string;
    assessmentType: string;
    notifyUserId?: string;
  },
) {
  return withTransaction("launch-assessment", async (uow) => {
    const session = await uow.step({
      name: "create-assessment-session",
      run: () =>
        repos.assessmentSessions.create(context, {
          organisationId: input.organisationId,
          workspaceId: input.workspaceId,
          ownerKey: input.ownerKey,
          organisationName: input.organisationName,
          assessmentType: input.assessmentType,
          status: "draft",
          progress: 0,
          metadata: {},
        }),
      compensate: async (created) => {
        await repos.assessmentSessions.hardDeleteById({ ...context, crossTenant: true }, created.id);
      },
    });

    if (input.notifyUserId) {
      await uow.step({
        name: "notify-owner",
        run: () =>
          repos.notifications.create(context, {
            userId: input.notifyUserId,
            organisationId: input.organisationId,
            workspaceId: input.workspaceId,
            module: "assessment",
            eventType: "assessment.launched",
            title: "Assessment ready",
            body: `${input.organisationName} assessment is ready to complete.`,
            severity: "info",
            metadata: { sessionId: session.id },
          }),
      });
    }

    return session;
  });
}

export function acceptInvitationTransaction(
  repos: PlatformRepositories,
  context: TenantContext,
  input: { organisationId: string; userId: string; role: string; workspaceId?: string | null },
) {
  return withTransaction("accept-invitation", async (uow) => {
    const membership = await uow.step({
      name: "create-organisation-membership",
      run: () =>
        repos.organisationMemberships.create(context, {
          organisationId: input.organisationId,
          userId: input.userId,
          role: input.role,
          status: "active",
          joinedAt: new Date().toISOString(),
        }),
      compensate: async (created) => {
        await repos.organisationMemberships.hardDeleteById({ ...context, crossTenant: true }, created.id);
      },
    });

    if (input.workspaceId) {
      await uow.step({
        name: "create-workspace-membership",
        run: () =>
          repos.workspaceMemberships.create(context, {
            workspaceId: input.workspaceId!,
            userId: input.userId,
            role: input.role,
            status: "active",
            joinedAt: new Date().toISOString(),
          }),
        compensate: async (created) => {
          await repos.workspaceMemberships.hardDeleteById({ ...context, crossTenant: true }, created.id);
        },
      });
    }

    return membership;
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workspace";
}
