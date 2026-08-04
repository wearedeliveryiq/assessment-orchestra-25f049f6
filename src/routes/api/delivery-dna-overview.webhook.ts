import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-overview/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleDeliveryDnaOverviewWebhook } =
          await import("@/lib/delivery-dna/overview-payment.server");
        return handleDeliveryDnaOverviewWebhook(request);
      },
    },
  },
});
