import { createFileRoute } from "@tanstack/react-router";
import { handleGetPack } from "@/lib/knowledge-packs/http.server";

/** GET /knowledge-pack/{id} */
export const Route = createFileRoute("/knowledge-pack/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleGetPack(request, params.id),
    },
  },
});
