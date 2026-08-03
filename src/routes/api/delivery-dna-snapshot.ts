import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-snapshot")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getSnapshot, handleSnapshotRoute } =
          await import("@/lib/delivery-dna/snapshot.server");
        return handleSnapshotRoute(request, () => getSnapshot(request));
      },
      POST: async ({ request }) => {
        const { handleSnapshotRoute, snapshotResponse, startSnapshot } =
          await import("@/lib/delivery-dna/snapshot.server");
        return handleSnapshotRoute(request, async () => {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const started = await startSnapshot(request, body.restart === true);
          return snapshotResponse(started.data, started.cookie);
        });
      },
      PUT: async ({ request }) => {
        const { handleSnapshotRoute, saveSnapshotResponse } =
          await import("@/lib/delivery-dna/snapshot.server");
        return handleSnapshotRoute(request, async () => {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          return saveSnapshotResponse(request, body);
        });
      },
    },
  },
});
