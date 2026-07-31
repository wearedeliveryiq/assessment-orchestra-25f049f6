import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { createSession, searchSessions } from "@/lib/sessions/session.server";
import type { SessionSearchFilter } from "@/lib/sessions/types";

export const Route = createFileRoute("/api/assessment-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const params = new URL(request.url).searchParams;
          const filter: SessionSearchFilter & { assignedToMe?: boolean; ownedByMe?: boolean } = {
            query: params.get("q") ?? undefined,
            organisationId: params.get("organisationId") ?? undefined,
            workspaceId: params.get("workspaceId") ?? undefined,
            knowledgePackId: params.get("knowledgePackId") ?? undefined,
            status: (params.get("status") ?? undefined) as never,
            tags: params.get("tags")?.split(",").filter(Boolean),
            dueBefore: params.get("dueBefore") ?? undefined,
            dueAfter: params.get("dueAfter") ?? undefined,
            includeArchived: params.get("includeArchived") === "true",
            assignedToMe: params.get("assignedToMe") === "true",
            ownedByMe: params.get("ownedByMe") === "true",
            limit: params.get("limit") ? Number(params.get("limit")) : undefined,
            offset: params.get("offset") ? Number(params.get("offset")) : undefined,
          };
          return ok(await searchSessions(identity, filter));
        }),
      POST: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await createSession(
              identity,
              (await readJson(request)) as never,
              requestContext(request),
            ),
            201,
          ),
        ),
    },
  },
});
