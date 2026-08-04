import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-overviews/$runId/report.pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getDeliveryDnaOverviewReport } =
          await import("@/lib/delivery-dna/overview-report.server");
        return getDeliveryDnaOverviewReport(request, params.runId);
      },
    },
  },
});
