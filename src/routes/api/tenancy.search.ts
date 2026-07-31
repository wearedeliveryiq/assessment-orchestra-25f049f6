import { createFileRoute } from "@tanstack/react-router";

import { handleProtectedRoute, ok } from "@/lib/identity/http.server";
import { searchTenancy } from "@/lib/tenancy/search.server";

export const Route = createFileRoute("/api/tenancy/search")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleProtectedRoute(request, async ({ identity }) => {
          const query = new URL(request.url).searchParams.get("q") ?? "";
          return ok(await searchTenancy(identity, query));
        }),
    },
  },
});
