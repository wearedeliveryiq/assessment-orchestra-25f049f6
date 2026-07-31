import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok, readJson } from "@/lib/identity/http.server";
import { requestContext } from "@/lib/sessions/audit.server";
import { addParticipant, listParticipants, removeParticipant } from "@/lib/sessions/collaboration.server";

export const Route = createFileRoute("/api/assessment-sessions/$id/participants")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(await listParticipants(identity, params.id)),
        ),
      POST: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await addParticipant(
              identity,
              params.id,
              (await readJson(request)) as never,
              requestContext(request),
            ),
            201,
          ),
        ),
      DELETE: async ({ request, params }) =>
        handleProtectedRoute(request, async ({ identity }) =>
          ok(
            await removeParticipant(
              identity,
              params.id,
              (await readJson(request)) as never,
              requestContext(request),
            ),
          ),
        ),
    },
  },
});
