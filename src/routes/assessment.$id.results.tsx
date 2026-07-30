import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { useHydrated } from "@/hooks/use-hydrated";
import type { RecommendationItem, SectionScore } from "@/lib/assessment/types";

export const Route = createFileRoute("/assessment/$id/results")({
  head: () => ({
    meta: [
      { title: "Assessment results — DeliveryIQ" },
      {
        name: "description",
        content:
          "Scores, detected patterns, rule findings and the executive narrative for a completed DeliveryIQ assessment.",
      },
      { property: "og:title", content: "Assessment results — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Scores, detected patterns, rule findings and the executive narrative for a completed DeliveryIQ assessment.",
      },
    ],
  }),
  component: ResultsPage,
});

const BAND_TONE: Record<SectionScore["band"], string> = {
  leading: "text-success",
  performing: "text-primary",
  developing: "text-warning",
  "at-risk": "text-destructive",
};

const HORIZON_LABEL: Record<RecommendationItem["horizon"], string> = {
  now: "Now",
  next: "Next",
  later: "Later",
};

function ResultsPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();

  const { data, error, isLoading } = useQuery({
    queryKey: assessmentKeys.results(id),
    queryFn: () => assessmentApi.results(id),
    enabled: hydrated,
  });

  if (error) {
    return (
      <AppShell>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
        <Link
          to="/assessment/$id/processing"
          params={{ id }}
          className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to processing
        </Link>
      </AppShell>
    );
  }

  if (!hydrated || isLoading || !data) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
        </div>
      </AppShell>
    );
  }

  const { results, session } = data;

  return (
    <AppShell action={<StatusPill status={session.status} />}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All assessments
        </Link>
        <Link
          to="/dashboard/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-foreground"
        >
          Executive dashboard
        </Link>
      </div>


      <section className="ribbon-panel mt-4 rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {session.organisationName}
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
              {results.narrative.headline}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {results.narrative.summary}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface/70 px-6 py-5 text-center">
            <p className="font-display text-4xl font-bold text-gradient-ribbon">
              {results.scores.overall.toFixed(1)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              of 5.0 · {results.scores.band}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {results.scores.sections.map((section) => (
          <div
            key={section.sectionId}
            className="ribbon-edge rounded-xl border border-border/70 bg-card p-5 pl-6"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <p className={`mt-2 font-display text-2xl font-semibold ${BAND_TONE[section.band]}`}>
              {section.score.toFixed(1)}
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="ribbon-bar h-full"
                style={{ width: `${(section.score / 5) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] capitalize text-muted-foreground">{section.band}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Recommendations">
          <ul className="space-y-3">
            {results.recommendations.map((rec) => (
              <li key={rec.id} className="rounded-lg border border-border/70 bg-surface/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {HORIZON_LABEL[rec.horizon]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {rec.impact} impact
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">{rec.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{rec.rationale}</p>
              </li>
            ))}
            {results.recommendations.length === 0 && <Empty>No interventions required.</Empty>}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Detected patterns">
            <ul className="space-y-3">
              {results.patterns.map((pattern) => (
                <li key={pattern.id} className="rounded-lg border border-border/70 bg-surface/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{pattern.name}</p>
                    <span className="text-[11px] tabular-nums text-primary">
                      {Math.round(pattern.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{pattern.description}</p>
                </li>
              ))}
              {results.patterns.length === 0 && <Empty>No patterns matched.</Empty>}
            </ul>
          </Panel>

          <Panel title="Rule findings">
            <ul className="space-y-2">
              {results.rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-surface/50 p-3"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">{rule.detail}</p>
                  </div>
                </li>
              ))}
              {results.rules.length === 0 && <Empty>No rules triggered.</Empty>}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Narrative" className="mt-6">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {results.narrative.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Panel>

      <Panel title="Signals" className="mt-6">
        <ul className="grid gap-2 sm:grid-cols-2">
          {results.signals.map((signal) => (
            <li
              key={signal.id}
              className="rounded-lg border border-border/70 bg-surface/50 px-4 py-3 text-sm"
            >
              <span
                className={`mr-2 text-[10px] font-semibold uppercase tracking-wider ${
                  signal.direction === "positive" ? "text-success" : "text-destructive"
                }`}
              >
                {signal.strength}
              </span>
              <span className="text-muted-foreground">{signal.statement}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ribbon-panel rounded-xl p-6 ${className}`}>
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      {children}
    </li>
  );
}
