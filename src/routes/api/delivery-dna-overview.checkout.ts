import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-overview/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createDeliveryDnaOverviewCheckout, handleOverviewPaymentError } =
          await import("@/lib/delivery-dna/overview-payment.server");
        try {
          const body = (await request.json().catch(() => ({}))) as { assessmentId?: unknown };
          return Response.json(
            await createDeliveryDnaOverviewCheckout(request, String(body.assessmentId ?? "")),
            { headers: { "cache-control": "private, no-store" } },
          );
        } catch (error) {
          return handleOverviewPaymentError(error);
        }
      },
    },
  },
});
