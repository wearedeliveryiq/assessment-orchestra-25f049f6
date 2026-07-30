import { createFileRoute } from "@tanstack/react-router";
import { handleReloadPacks } from "@/lib/knowledge-packs/http.server";

/** POST /knowledge-packs/reload — rediscover and revalidate every pack. */
export const Route = createFileRoute("/knowledge-packs/reload")({
  server: {
    handlers: {
      POST: async ({ request }) => handleReloadPacks(request),
    },
  },
});
