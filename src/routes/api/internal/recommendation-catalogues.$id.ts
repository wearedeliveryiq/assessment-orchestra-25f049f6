import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-catalogues/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getCatalogueVersion } = await import("@/lib/recommendation-catalogue/http.server");
        return getCatalogueVersion(request, params.id);
      },
    },
  },
});
