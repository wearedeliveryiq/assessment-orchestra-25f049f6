import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-snapshot/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { completeSnapshot, handleSnapshotRoute } =
          await import("@/lib/delivery-dna/snapshot.server");
        return handleSnapshotRoute(request, () => completeSnapshot(request));
      },
    },
  },
});
