import { createFileRoute } from "@tanstack/react-router";
import { handleListPacks, handleReloadPacks } from "@/lib/knowledge-packs/http.server";

/** GET /knowledge-packs — installed packs. */
export const Route = createFileRoute("/knowledge-packs/")({
  server: {
    handlers: {
      GET: async () => handleListPacks(),
      POST: async ({ request }) => handleReloadPacks(request),
    },
  },
});
