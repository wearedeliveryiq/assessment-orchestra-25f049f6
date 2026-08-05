import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-snapshot/report.pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getDeliveryDnaSnapshotReport } =
          await import("@/lib/delivery-dna/snapshot-report.server");
        return getDeliveryDnaSnapshotReport(request);
      },
    },
  },
});
