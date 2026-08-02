import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recommendation-catalogues/$id/command")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { postCatalogueCommand } = await import("@/lib/recommendation-catalogue/http.server");
        return postCatalogueCommand(request, params.id);
      },
    },
  },
});
