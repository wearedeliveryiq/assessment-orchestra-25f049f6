import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommendation-audit-exports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postRecommendationAuditExport } =
          await import("@/lib/recommendation-governance/http.server");
        return postRecommendationAuditExport(request);
      },
    },
  },
});
