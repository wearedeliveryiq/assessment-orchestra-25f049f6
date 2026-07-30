import { createFileRoute } from "@tanstack/react-router";
import { handleEvidence } from "@/lib/audit/http.server";

/** GET /evidence/{entityType}/{entityId} — bidirectional evidence neighbourhood. */
export const Route = createFileRoute("/evidence/$entityType/$entityId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleEvidence(request, params.entityType, params.entityId),
    },
  },
});
