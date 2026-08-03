import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-snapshot/continue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { continueSnapshot, handleSnapshotRoute } =
          await import("@/lib/delivery-dna/snapshot.server");
        return handleSnapshotRoute(request, async () => {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          return continueSnapshot(request, body);
        });
      },
    },
  },
});
