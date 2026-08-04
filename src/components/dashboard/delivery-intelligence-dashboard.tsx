import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchLatestIntelligence,
  fetchAnalysisStatus,
  downloadDeliveryDnaOverviewReport,
  retryAnalysis,
} from "@/lib/delivery-intelligence/client";
import { useHydrated } from "@/hooks/use-hydrated";

export function DeliveryIntelligenceDashboard({ assessmentId }: { assessmentId: string }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["delivery-intelligence-status", assessmentId],
    queryFn: () => fetchAnalysisStatus(assessmentId),
    enabled: hydrated,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === "completed" || state === "failed" || state === "ineligible" ? false : 2_000;
    },
  });
  const query = useQuery({
    queryKey: ["delivery-intelligence", assessmentId],
    queryFn: () => fetchLatestIntelligence(assessmentId),
    enabled: hydrated && statusQuery.data?.state === "completed",
    staleTime: 60_000,
  });
  const retry = useMutation({
    mutationFn: () => retryAnalysis(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["delivery-intelligence-status", assessmentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["delivery-intelligence", assessmentId] });
    },
  });
  const report = useMutation({
    mutationFn: async () => {
      if (!query.data?.analysisRunId) throw new Error("The board-ready Overview is not ready.");
      await downloadDeliveryDnaOverviewReport(query.data.analysisRunId);
    },
  });
  useEffect(() => {
    if (statusQuery.data?.state === "completed") {
      void queryClient.invalidateQueries({ queryKey: ["delivery-intelligence", assessmentId] });
    }
  }, [assessmentId, queryClient, statusQuery.data?.state]);

  if (!hydrated || statusQuery.isPending)
    return (
      <div
        className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing your Delivery
        Intelligence…
      </div>
    );

  if (statusQuery.error)
    return (
      <section
        role="alert"
        className="rounded-xl border border-destructive/40 bg-destructive/10 p-5"
      >
        <h2 className="font-semibold">Delivery Intelligence is temporarily unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {statusQuery.error.message} Your assessment is safe.
        </p>
      </section>
    );

  const handoff = statusQuery.data;
  if (handoff?.state === "ineligible") {
    return (
      <section aria-live="polite" className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div>
            <h2 className="font-semibold">
              Delivery Intelligence isn’t available for this assessment
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{handoff.safeMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {handoff.canViewAssessment && (
                <a
                  href={`/assessment/${assessmentId}/results`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium"
                >
                  View assessment
                </a>
              )}
              {handoff.canStartDeliveryDna && (
                <a
                  href="/sessions/new"
                  className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Start a Delivery DNA assessment
                </a>
              )}
            </div>
            {handoff.supportReference && (
              <p className="mt-4 text-sm text-muted-foreground">
                Contact support and quote {handoff.supportReference}.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (handoff && handoff.state !== "completed") {
    const processing = ["preparing", "queued", "running"].includes(handoff.state);
    const canRetry =
      handoff.retryable && (handoff.state === "failed" || handoff.state === "missing");
    return (
      <section
        aria-live="polite"
        aria-busy={processing}
        className={`rounded-xl border p-6 ${
          processing ? "border-primary/30 bg-primary/5" : "border-destructive/40 bg-destructive/10"
        }`}
      >
        <div className="flex items-start gap-3">
          {processing ? (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          )}
          <div>
            <h2 className="font-semibold">
              {processing ? handoff.safeMessage : "Delivery Intelligence needs attention"}
            </h2>
            {!processing && (
              <p className="mt-2 text-sm text-muted-foreground">{handoff.safeMessage}</p>
            )}
            {handoff.state === "failed" && !handoff.retryable && (
              <p className="mt-2 text-sm text-muted-foreground">
                Please contact support
                {handoff.supportReference ? ` and quote ${handoff.supportReference}` : ""}.
              </p>
            )}
            {retry.error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {retry.error.message}
              </p>
            )}
            {canRetry && (
              <button
                type="button"
                disabled={retry.isPending}
                onClick={() => retry.mutate()}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retry.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                Retry analysis
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (query.isPending)
    return (
      <div
        className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Your Delivery Intelligence is
        ready. Loading result…
      </div>
    );
  if (query.error || !query.data)
    return (
      <section
        role="alert"
        className="rounded-xl border border-destructive/40 bg-destructive/10 p-5"
      >
        <h2 className="font-semibold">Delivery Intelligence result is temporarily unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your assessment and completed analysis are safe. Please refresh shortly.
        </p>
      </section>
    );
  const result = query.data;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Delivery DNA Overview
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {result.executiveSummary.overallPosition}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {result.executiveSummary.confidence}
            </p>
            {result.executiveSummary.caveat && (
              <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                {result.executiveSummary.caveat}
              </p>
            )}
          </div>
          <div className="min-w-36 rounded-xl border border-border bg-background/60 p-5 text-center">
            <span className="block text-4xl font-semibold text-primary">
              {result.overall.displayScore ?? "—"}
            </span>
            <span className="mt-1 block text-xs capitalize text-muted-foreground">
              {result.overall.band ?? "Insufficient evidence"}
            </span>
            <span className="mt-4 block text-lg font-semibold">
              {result.confidence.displayIndex}
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {result.confidence.band} confidence
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {result.capabilities.reduce((total, item) => total + item.eligibleAnswerCount, 0)} of{" "}
              {result.capabilities.reduce((total, item) => total + item.totalQuestionCount, 0)}{" "}
              responses contribute
            </span>
          </div>
        </div>
      </section>
      <section
        aria-labelledby="capabilities-title"
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 id="capabilities-title" className="text-xl font-semibold">
          Delivery capabilities
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.capabilities.map((capability) => (
            <article key={capability.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{capability.label}</h3>
                <span className="text-lg font-semibold text-primary">
                  {capability.displayScore ?? "—"}
                </span>
              </div>
              <p className="mt-2 text-xs capitalize text-muted-foreground">
                {capability.state === "available" ? capability.band : "Insufficient evidence"} ·{" "}
                {capability.eligibleAnswerCount}/{capability.totalQuestionCount} eligible answers
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full bg-primary"
                  style={{ width: `${capability.displayScore ?? 0}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <ListPanel
          title="Strengths"
          ids={result.findings.strengths}
          labels={result.capabilities}
          empty="No capability meets the approved strength threshold."
        />
        <ListPanel
          title="Priority opportunities"
          ids={result.findings.priorityOpportunities}
          labels={result.capabilities}
          empty="No capability meets the approved priority threshold."
        />
      </div>
      <RecommendationOverview recommendations={result.recommendations} />
      {result.roadmapPreview ? <RoadmapPreview result={result.roadmapPreview} /> : null}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">How this connects to your evidence</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The capability profile, findings and priorities are calculated from the recorded
          39-question Delivery DNA evidence using the locked scoring and confidence rules. Missing
          and not-applicable evidence remain visible in coverage and limitations; restricted
          internal rule predicates and respondent identity are not included in this Overview.
        </p>
      </section>
      {result.industryContext.length ? (
        <section
          className="rounded-2xl border border-border bg-card p-6"
          aria-labelledby="industry-context-title"
        >
          <h2 id="industry-context-title" className="text-xl font-semibold">
            Why this matters now
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.industryContext.map((item) => (
              <article key={item.id} className="rounded-xl border border-border/70 p-4">
                <p className="text-sm leading-6">{item.approvedCustomerSafeWording}</p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  {item.publisher} · {item.evidenceYear}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {item.scopeOrMethodCaveat}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {item.notCustomerPredictionCaveat}
                </p>
                <a
                  href={item.originalSourceReference}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View source <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-xl font-semibold">Overview now. Action later.</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.action.message}</p>
      </section>
      <button
        type="button"
        disabled={report.isPending}
        onClick={() => report.mutate()}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        {report.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Download className="h-4 w-4" aria-hidden />
        )}
        {result.downloadableReport.label}
      </button>
      {report.error ? (
        <p className="text-sm text-destructive" role="alert">
          {report.error.message}
        </p>
      ) : null}
    </div>
  );
}

function RecommendationOverview({
  recommendations,
}: {
  recommendations: Array<{
    title: string;
    priorityLabel?: string;
    impact: string;
    effort: string;
    safeReason?: string;
    expectedOutcome?: string;
    practicalFirstStep?: string;
  }>;
}) {
  return (
    <section
      aria-labelledby="priority-recommendations-title"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h2 id="priority-recommendations-title" className="text-xl font-semibold">
        Priority recommendations
      </h2>
      {recommendations.length ? (
        <ol className="mt-4 space-y-3">
          {recommendations.map((item) => (
            <li
              key={`${item.title}:${item.priorityLabel}`}
              className="rounded-xl border border-border/70 p-4"
            >
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {item.priorityLabel ?? "priority"} · {item.impact} impact · {item.effort} effort
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.safeReason ?? ""}
              </p>
              <p className="mt-2 text-sm">Expected outcome: {item.expectedOutcome ?? ""}</p>
              <p className="mt-2 text-sm">
                What to do first: {item.practicalFirstStep ?? item.title}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No recommendation meets the approved presentation rules for this result.
        </p>
      )}
    </section>
  );
}

function RoadmapPreview({
  result,
}: {
  result: {
    day30: Array<{ title: string; horizon: string; priorityLabel: string }>;
    day60: Array<{ title: string; horizon: string; priorityLabel: string }>;
    day90: Array<{ title: string; horizon: string; priorityLabel: string }>;
  };
}) {
  return (
    <section
      aria-labelledby="roadmap-preview-title"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h2 id="roadmap-preview-title" className="text-xl font-semibold">
        30/60/90-day direction
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(["day30", "day60", "day90"] as const).map((horizon) => {
          const item = result[horizon][0];
          const label =
            horizon === "day30" ? "30 days" : horizon === "day60" ? "60 days" : "90 days";
          return (
            <div key={horizon} className="rounded-xl border border-border/70 p-4">
              <h3 className="font-medium">{label}</h3>
              {item ? (
                <div className="mt-3 text-sm">
                  <p>{item.title}</p>
                  <p className="mt-1 capitalize text-muted-foreground">
                    {item.priorityLabel} priority
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No item scheduled.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ListPanel({
  title,
  ids,
  labels,
  empty,
}: {
  title: string;
  ids: string[];
  labels: Array<{ id: string; label: string }>;
  empty: string;
}) {
  const names = new Map(labels.map((item) => [item.id, item.label]));
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {ids.length ? (
        <ul className="mt-4 space-y-2">
          {ids.map((id) => (
            <li key={id} className="rounded-lg border border-border/70 px-4 py-3 text-sm">
              {names.get(id) ?? id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
