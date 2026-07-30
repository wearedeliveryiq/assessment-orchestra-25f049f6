import { createFileRoute } from "@tanstack/react-router";
import { handleGetPackVersions } from "@/lib/knowledge-packs/http.server";

/** GET /knowledge-pack/{id}/versions */
export const Route = createFileRoute("/knowledge-pack/$id/versions")({
  server: {
    handlers: {
      GET: async ({ params }) => handleGetPackVersions(params.id),
    },
  },
});
