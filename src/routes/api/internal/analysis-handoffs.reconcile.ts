import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/analysis-handoffs/reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ANALYSIS_RECONCILER_SECRET;
        const supplied = request.headers.get("authorization");
        if (!expected || supplied !== `Bearer ${expected}`) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
        const { analysisHandoffService } = await import("@/lib/analysis/handoff-service.server");
        const result = await analysisHandoffService.reconcile(100);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
