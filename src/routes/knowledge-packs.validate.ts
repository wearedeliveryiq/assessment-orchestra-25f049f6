import { createFileRoute } from "@tanstack/react-router";
import { handleValidatePacks } from "@/lib/knowledge-packs/http.server";

/** POST /knowledge-packs/validate — validate one pack or the whole library. */
export const Route = createFileRoute("/knowledge-packs/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => handleValidatePacks(request),
    },
  },
});
