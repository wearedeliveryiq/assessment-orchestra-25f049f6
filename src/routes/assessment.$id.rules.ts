import { createFileRoute } from "@tanstack/react-router";
import { handleRuleRoute } from "@/lib/rules/http.server";

/** GET /assessment/{id}/rules */
export const Route = createFileRoute("/assessment/$id/rules")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleRuleRoute(request, (service, ownerKey) => service.listRules(params.id, ownerKey)),
    },
  },
});
