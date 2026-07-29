import { createFileRoute } from "@tanstack/react-router";
import { handleRuleRoute } from "@/lib/rules/http.server";

/** GET /rule/{id} — rule result with its full traceability chain. */
export const Route = createFileRoute("/rule/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleRuleRoute(request, (service, ownerKey) => service.getRuleTrace(params.id, ownerKey)),
    },
  },
});
