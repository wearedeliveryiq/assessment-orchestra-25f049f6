import { createFileRoute } from "@tanstack/react-router";
import { handleActivatePack } from "@/lib/knowledge-packs/http.server";

/** POST /knowledge-pack/{id}/activate */
export const Route = createFileRoute("/knowledge-pack/$id/activate")({
  server: {
    handlers: {
      POST: async ({ request, params }) => handleActivatePack(request, params.id),
    },
  },
});
