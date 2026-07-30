import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { AssessmentHealthWidget } from "@/components/dashboard/assessment-health-widget";
import { AssessmentSummaryCard } from "@/components/dashboard/assessment-summary-card";
import { CapabilityScoreCards } from "@/components/dashboard/capability-score-cards";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { EvidenceExplorer } from "@/components/dashboard/evidence-explorer";
import { ExecutiveSummary } from "@/components/dashboard/executive-summary";
import { MaturityWidget } from "@/components/dashboard/maturity-widget";
import { PatternsWidget } from "@/components/dashboard/patterns-widget";
import { RecommendationsWidget } from "@/components/dashboard/recommendations-widget";
import { ReportCenter } from "@/components/dashboard/report-center";
import { WidgetSkeleton } from "@/components/dashboard/widget";
import { DashboardProvider, useDashboard } from "@/lib/dashboard/dashboard-provider";

const TITLE = "Executive dashboard — DeliveryIQ";
const DESCRIPTION =
  "Evidence-backed delivery maturity intelligence: capability scores, organisational patterns, priority recommendations and full provenance for every figure.";

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
    <AppShell>
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">That assessment could not be found.</p>
    </AppShell>
  ),
});

function DashboardBody() {
  const { isLoading, error, data } = useDashboard();

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {error.message}
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <WidgetSkeleton rows={2} />
          <WidgetSkeleton rows={4} />
          <WidgetSkeleton rows={3} />
        </div>
        <WidgetSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardFilters />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <AssessmentSummaryCard />
            <MaturityWidget />
          </div>
          <CapabilityScoreCards />
          <ExecutiveSummary />
          <div className="grid gap-4 lg:grid-cols-2">
            <PatternsWidget />
            <RecommendationsWidget />
          </div>
          <ReportCenter />
          <AssessmentHealthWidget />
        </div>
        <EvidenceExplorer />
      </div>
    </div>
  );
}

function DashboardPage() {
  const { id } = Route.useParams();

  return (
    <DashboardProvider assessmentId={id}>
      <AppShell action={<DashboardActions />}>
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Executive dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every figure below is produced by the Intelligence Runtime and traceable to a source
              answer.
            </p>
          </div>
          <Link
            to="/assessment/$id/results"
            params={{ id }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Results
          </Link>
        </div>
        <DashboardBody />
      </AppShell>
    </DashboardProvider>
  );
}
