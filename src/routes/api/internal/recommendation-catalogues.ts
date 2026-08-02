import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-catalogues")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getCatalogueVersion } = await import("@/lib/recommendation-catalogue/http.server");
        return getCatalogueVersion(request);
      },
      POST: async ({ request }) => {
        const { postCatalogueVersion } = await import("@/lib/recommendation-catalogue/http.server");
        return postCatalogueVersion(request);
      },
    },
  },
});
