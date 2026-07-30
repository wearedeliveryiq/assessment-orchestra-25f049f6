import { createFileRoute } from "@tanstack/react-router";
import { handleRetention } from "@/lib/audit/http.server";

/** GET/POST/PUT /audit/retention — retention policy management. */
export const Route = createFileRoute("/audit/retention")({
  server: {
    handlers: {
      GET: async ({ request }) => handleRetention(request),
      POST: async ({ request }) => handleRetention(request),
      PUT: async ({ request }) => handleRetention(request),
    },
  },
});
