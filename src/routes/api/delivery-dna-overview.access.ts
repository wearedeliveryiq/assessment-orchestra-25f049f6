import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/delivery-dna-overview/access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const assessmentId = new URL(request.url).searchParams.get("assessmentId") ?? "";
          const { assessmentRequestContext } =
            await import("@/lib/identity/assessment-auth.server");
          const { resolveDeliveryDnaOverviewAccess } =
            await import("@/lib/delivery-dna/overview-access.server");
          const context = await assessmentRequestContext(request);
          const access = await resolveDeliveryDnaOverviewAccess({ assessmentId, context });
          if (!access)
            return Response.json(
              { error: "The Saved Snapshot is not available." },
              { status: 404 },
            );
          return Response.json(access, { headers: { "cache-control": "private, no-store" } });
        } catch {
          return Response.json({ error: "The Saved Snapshot is not available." }, { status: 404 });
        }
      },
    },
  },
});
