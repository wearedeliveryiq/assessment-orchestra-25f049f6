import { createFileRoute } from "@tanstack/react-router";

import { DeliveryIntelligenceDashboard } from "@/components/dashboard/delivery-intelligence-dashboard";
import { SnapshotAcquisitionShell } from "@/components/delivery-dna/snapshot-shell";

const TITLE = "Delivery DNA Overview — DeliveryIQ";
const DESCRIPTION =
  "Your bounded Delivery DNA Overview: capability scores, evidence confidence, priority findings and practical next steps.";

export const Route = createFileRoute("/dashboard/$id")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <SnapshotAcquisitionShell>
      <p
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {error.message}
      </p>
    </SnapshotAcquisitionShell>
  ),
  notFoundComponent: () => (
    <SnapshotAcquisitionShell>
      <p className="text-sm text-muted-foreground">That assessment could not be found.</p>
    </SnapshotAcquisitionShell>
  ),
});

function DashboardPage() {
  const { id } = Route.useParams();

  return (
    <SnapshotAcquisitionShell>
      <div className="delivery-dna-overview-screen">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#14B8A6]">
            Delivery DNA™
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your Delivery DNA Overview
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#CBD5E1] sm:text-base">
            A decision-ready view of your delivery capability, grounded in your recorded evidence
            and the locked DeliveryIQ analysis rules.
          </p>
        </div>
        <DeliveryIntelligenceDashboard assessmentId={id} />
      </div>
    </SnapshotAcquisitionShell>
  );
}
