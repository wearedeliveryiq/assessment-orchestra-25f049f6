import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-audit-exports/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getRecommendationAuditExport } =
          await import("@/lib/recommendation-governance/http.server");
        return getRecommendationAuditExport(request, params.id);
      },
      POST: async ({ request, params }) => {
        const { postRecommendationAuditExportRetry } =
          await import("@/lib/recommendation-governance/http.server");
        return postRecommendationAuditExportRetry(request, params.id);
      },
    },
  },
});
