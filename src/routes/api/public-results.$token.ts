import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public-results/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getPublicResult } = await import("@/lib/delivery-intelligence/public-http.server");
        return getPublicResult(request, params.token);
      },
    },
  },
});
