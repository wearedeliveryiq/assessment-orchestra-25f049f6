import { createFileRoute } from "@tanstack/react-router";
import { handleExplain } from "@/lib/audit/http.server";

/** GET /explain/{entityType}/{entityId} — structured reasoning payload. */
export const Route = createFileRoute("/explain/$entityType/$entityId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleExplain(request, params.entityType, params.entityId),
    },
  },
});
