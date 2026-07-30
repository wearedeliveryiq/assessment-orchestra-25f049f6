import { createFileRoute } from "@tanstack/react-router";
import { handleTrace } from "@/lib/audit/http.server";

/** GET /trace/{entityType}/{entityId} — full decision trace. */
export const Route = createFileRoute("/trace/$entityType/$entityId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleTrace(request, params.entityType, params.entityId),
    },
  },
});
