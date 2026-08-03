import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Printer, RotateCcw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  recordRecommendationDecision,
  type RecommendationDecisionView,
  type RecommendationPortfolioView,
} from "@/lib/recommendation-decisions/client";
import type { RecommendationDecisionReasonCategory } from "@/lib/recommendation-decisions/model";
import { RecommendationActionControls } from "@/components/dashboard/recommendation-action-controls";
import { fetchRecommendationExperience } from "@/lib/recommendation-experience/client";
import {
  fetchRecommendationAnalyticsConsent,
  sendRecommendationAnalyticsEvent,
  setRecommendationAnalyticsConsent,
  type RecommendationAnalyticsConsentView,
} from "@/lib/recommendation-analytics/client";

const reasonOptions: Array<{ value: RecommendationDecisionReasonCategory; label: string }> = [
  { value: "not_relevant", label: "Not relevant" },
  { value: "already_addressed", label: "Already addressed" },
  { value: "not_feasible", label: "Not feasible" },
  { value: "wrong_timing", label: "Wrong timing" },
  { value: "insufficient_evidence", label: "Insufficient evidence" },
  { value: "other", label: "Other" },
];

export function RecommendationPortfolioSection({
  portfolio,
}: {
  portfolio: RecommendationPortfolioView;
}) {
  const query = useQuery({
    queryKey: ["recommendation-experience", portfolio.portfolioId],
    queryFn: () => fetchRecommendationExperience(portfolio.portfolioId),
  });
  const consentQuery = useQuery({
    queryKey: ["recommendation-analytics-consent", portfolio.portfolioId],
    queryFn: fetchRecommendationAnalyticsConsent,
  });
  const viewedSnapshot = useRef<string | null>(null);
  useEffect(() => {
    if (
      !query.data ||
      consentQuery.data?.status !== "granted" ||
      viewedSnapshot.current === query.data.snapshot.version
    )
      return;
    viewedSnapshot.current = query.data.snapshot.version;
    void sendRecommendationAnalyticsEvent({
      eventId: `portfolio:${query.data.snapshot.version}:${query.data.portfolioId}`,
      eventType: "portfolio_viewed",
      objectType: "portfolio",
      objectId: query.data.portfolioId,
      objectVersion: query.data.snapshot.version,
      mode: "workspace",
    });
  }, [consentQuery.data?.status, query.data]);
  if (query.isLoading) {
    return (
      <section aria-live="polite" className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Recommendation portfolio</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Preparing generated advice, customer decisions and action progress…
        </p>
      </section>
    );
  }
  if (query.error || !query.data) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Recommendation portfolio</h2>
        <p role="alert" className="mt-3 text-sm text-destructive">
          {query.error?.message ?? "The recommendation experience is temporarily unavailable."} No
          generated advice or customer record was changed.
        </p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 min-h-11 rounded-lg border border-border px-3 text-sm font-medium"
        >
          Try again
        </button>
      </section>
    );
  }
  const experience = query.data;
  return (
    <article
      aria-labelledby="recommendation-portfolio-title"
      className="min-w-0 rounded-2xl border border-border bg-card p-4 print:border-0 print:p-0 sm:p-6"
    >
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Generated advice
            </p>
            <h2 id="recommendation-portfolio-title" className="mt-2 text-xl font-semibold">
              Recommendation portfolio
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Review governed advice, record the organisation’s decision separately, and monitor
              accepted actions without changing the generated baseline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium print:hidden"
          >
            <Printer className="h-4 w-4" aria-hidden /> Print executive report
          </button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryMetric label="Recommendations" value={experience.summary.recommendationCount} />
          <SummaryMetric
            label="Trace coverage"
            value={`${experience.summary.traceCoveragePercentage}%`}
          />
          <SummaryMetric label="Accepted" value={experience.summary.decisions.accepted ?? 0} />
          <SummaryMetric label="In progress" value={experience.summary.actions.in_progress ?? 0} />
          <SummaryMetric label="Targets met" value={experience.summary.outcomes.target_met ?? 0} />
        </dl>
        <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>
            Report snapshot{" "}
            <time dateTime={experience.snapshot.at}>{formatDateTime(experience.snapshot.at)}</time>
          </p>
          <p className="mt-1 break-all">Snapshot version: {experience.snapshot.version}</p>
          <p className="mt-1">
            Generated baseline: {formatDateTime(experience.snapshot.generatedBaselineAt)} · policy{" "}
            {experience.snapshot.generatedBaselineVersion}
          </p>
          <p className="mt-2">{experience.report.associationNotice}</p>
        </div>
        <RecommendationAnalyticsConsentControls
          consent={consentQuery.data}
          loading={consentQuery.isLoading}
          error={consentQuery.error}
          portfolioId={portfolio.portfolioId}
        />
      </header>
      <div className="mt-6 space-y-7">
        {experience.groups
          .filter((group) => group.recommendations.length > 0)
          .map((group) => (
            <section
              key={group.classification}
              aria-labelledby={`portfolio-${group.classification}`}
            >
              <h3 id={`portfolio-${group.classification}`} className="text-base font-semibold">
                {group.label}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.count} item{group.count === 1 ? "" : "s"}
              </p>
              <ol className="mt-3 space-y-4">
                {group.recommendations.map((item) => (
                  <li
                    key={item.portfolioItemId}
                    className="min-w-0 break-words rounded-xl border border-border/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 max-w-3xl">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="mt-2 text-xs capitalize text-muted-foreground">
                          {group.label} · {item.priorityLabel} priority · {item.impact} impact ·{" "}
                          {item.effort} effort
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                        {item.decision?.currentDecision ?? "undecided"}
                      </span>
                    </div>
                    <details
                      className="mt-4 rounded-lg border border-border/70 p-3 print:block"
                      open
                      onToggle={(event) => {
                        if (event.currentTarget.open && consentQuery.data?.status === "granted") {
                          void sendRecommendationAnalyticsEvent({
                            eventId: `explanation:${experience.snapshot.version}:${item.portfolioItemId}`,
                            eventType: "explanation_opened",
                            objectType: "portfolio_item",
                            objectId: item.portfolioItemId,
                            objectVersion: item.sourceVersions.recommendation,
                          });
                        }
                      }}
                    >
                      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                        Why this was generated
                      </summary>
                      <div className="space-y-4 pb-2 text-sm">
                        <DetailList
                          label="Supporting capabilities or patterns"
                          values={item.why.matchedTriggers}
                        />
                        <DetailList
                          label="Evidence-backed rationale"
                          values={item.why.rationale.map((entry) => entry.statement)}
                        />
                        <div>
                          <p className="font-medium">Confidence and caveat</p>
                          <p className="mt-1 text-muted-foreground">
                            {humanize(item.confidence.state)} · {humanize(item.confidence.result)}
                            {item.confidence.caveat ? ` — ${item.confidence.caveat}` : ""}
                          </p>
                        </div>
                        <DetailList
                          label="Dependencies"
                          values={item.dependencies.map(
                            (dependency) =>
                              `${dependency.recommendationId}: ${humanize(dependency.state)}`,
                          )}
                          empty="No governed dependencies."
                        />
                        <div>
                          <p className="font-medium">Expected outcome</p>
                          <p className="mt-1 text-muted-foreground">{item.outcome}</p>
                        </div>
                        <DetailList label="Success measures" values={item.successMeasures} />
                        {item.outcomeMeasurement && (
                          <div>
                            <p className="font-medium">Outcome measurement</p>
                            {item.outcomeMeasurement.measures.length ? (
                              <ul className="mt-1 space-y-2 text-muted-foreground">
                                {item.outcomeMeasurement.measures.map((measure) => (
                                  <li key={measure.measureId}>
                                    <span className="font-medium text-foreground">
                                      {humanize(measure.status ?? "not_measured")}
                                    </span>{" "}
                                    — {measure.customerCopy ?? "No status recorded."}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-muted-foreground">No measure configured.</p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.outcomeMeasurement.associationNotice}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">Source versions</p>
                          <p className="mt-1 break-all text-muted-foreground">
                            Recommendation {item.sourceVersions.recommendation} · catalogue{" "}
                            {item.sourceVersions.catalogue} · configuration{" "}
                            {item.sourceVersions.configurationSet} · portfolio policy{" "}
                            {item.sourceVersions.portfolioPolicy}
                          </p>
                        </div>
                        {experience.controls.canViewAudit && (
                          <p className="text-muted-foreground">
                            Governed audit detail is available to your auditor role.
                          </p>
                        )}
                        {consentQuery.data?.status === "granted" && (
                          <UsefulnessControls
                            portfolioItemId={item.portfolioItemId}
                            recommendationVersion={item.sourceVersions.recommendation}
                            snapshotVersion={experience.snapshot.version}
                          />
                        )}
                      </div>
                    </details>
                    <div className="mt-4 border-t border-border/70 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Customer decision and progress
                      </p>
                    </div>
                    <RecommendationDecisionControls
                      decision={item.decision ?? undefined}
                      canDecide={experience.controls.canDecide}
                      portfolioId={portfolio.portfolioId}
                    />
                    <RecommendationActionControls
                      portfolioId={portfolio.portfolioId}
                      portfolioItemId={item.portfolioItemId}
                      accepted={item.decision?.currentDecision === "accepted"}
                      action={item.action ?? undefined}
                      canManage={experience.controls.canManageActions}
                      handoffOpportunities={item.handoffs}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        {!experience.groups.some((group) => group.recommendations.length > 0) && (
          <p className="text-sm text-muted-foreground">
            No action meets the approved recommendation rules.
          </p>
        )}
      </div>
    </article>
  );
}

function RecommendationAnalyticsConsentControls({
  consent,
  loading,
  error,
  portfolioId,
}: {
  consent: RecommendationAnalyticsConsentView | undefined;
  loading: boolean;
  error: Error | null;
  portfolioId: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: setRecommendationAnalyticsConsent,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["recommendation-analytics-consent", portfolioId],
      }),
  });
  return (
    <section aria-labelledby="recommendation-analytics-consent" className="mt-4 print:hidden">
      <h3 id="recommendation-analytics-consent" className="text-sm font-medium">
        Privacy-safe product improvement
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        You can share pseudonymous usage categories to help improve DeliveryIQ. Raw answers, notes,
        evidence and free text are never included. This never changes product rules automatically.
      </p>
      {loading && (
        <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
          Loading privacy preference…
        </p>
      )}
      {(error || mutation.error) && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {(error ?? mutation.error)?.message}
        </p>
      )}
      {!loading && !error && (
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(consent?.status === "granted" ? "withdrawn" : "granted")}
          className="mt-3 min-h-11 rounded-lg border border-border px-3 text-sm font-medium"
        >
          {consent?.status === "granted" ? "Stop sharing usage signals" : "Share usage signals"}
        </button>
      )}
    </section>
  );
}

function UsefulnessControls({
  portfolioItemId,
  recommendationVersion,
  snapshotVersion,
}: {
  portfolioItemId: string;
  recommendationVersion: string;
  snapshotVersion: string;
}) {
  const [submitted, setSubmitted] = useState<"helpful" | "not_helpful" | null>(null);
  const submit = async (usefulness: "helpful" | "not_helpful") => {
    const result = await sendRecommendationAnalyticsEvent({
      eventId: `usefulness:${snapshotVersion}:${portfolioItemId}`,
      eventType: "usefulness_submitted",
      objectType: "portfolio_item",
      objectId: portfolioItemId,
      objectVersion: recommendationVersion,
      properties: { usefulness },
    });
    if (result.recorded) setSubmitted(usefulness);
  };
  return (
    <div className="print:hidden">
      <p className="font-medium">Was this explanation useful?</p>
      {submitted ? (
        <p role="status" className="mt-1 text-muted-foreground">
          Thank you. Your privacy-safe response was recorded.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submit("helpful")}
            className="min-h-11 rounded-lg border border-border px-3"
          >
            Helpful
          </button>
          <button
            type="button"
            onClick={() => void submit("not_helpful")}
            className="min-h-11 rounded-lg border border-border px-3"
          >
            Not helpful
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function DetailList({
  label,
  values,
  empty = "Not recorded.",
}: {
  label: string;
  values: string[];
  empty?: string;
}) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      {values.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          {values.map((value) => (
            <li key={value}>{humanize(value)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function RecommendationDecisionControls({
  decision,
  canDecide,
  portfolioId,
}: {
  decision: RecommendationDecisionView | undefined;
  canDecide: boolean;
  portfolioId: string;
}) {
  const queryClient = useQueryClient();
  const reviewId = useId();
  const reasonId = useId();
  const [mode, setMode] = useState<"idle" | "accept" | "defer" | "reject">("idle");
  const [reviewAt, setReviewAt] = useState("");
  const [reason, setReason] = useState<RecommendationDecisionReasonCategory>("not_relevant");
  const mutation = useMutation({
    mutationFn: recordRecommendationDecision,
    onSuccess: async () => {
      setMode("idle");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendation-decisions", portfolioId] }),
        queryClient.invalidateQueries({ queryKey: ["recommendation-experience", portfolioId] }),
      ]);
    },
  });
  if (!decision)
    return (
      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        Loading customer decision…
      </p>
    );
  if (!canDecide) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        You can view this decision. An authorised decision-maker can change it.
      </p>
    );
  }
  const submit = (
    command: "accepted" | "deferred" | "rejected" | "restored",
    values: {
      acknowledged?: boolean;
      reasonCategory?: RecommendationDecisionReasonCategory;
      reviewAt?: string;
    } = {},
  ) =>
    mutation.mutate({
      portfolioItemId: decision.portfolioItemId,
      expectedVersion: decision.decisionVersion,
      decision: command,
      acknowledged: values.acknowledged,
      reasonCategory: values.reasonCategory,
      reviewAt: values.reviewAt,
    });
  return (
    <div className="mt-4 border-t border-border/70 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Customer decision
      </p>
      <p aria-live="polite" className="mt-1 text-sm">
        {decision.statusMessage}
      </p>
      {mutation.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {mode === "accept" && (
        <div
          role="group"
          aria-labelledby={`${reviewId}-accept-title`}
          className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
        >
          <h5 id={`${reviewId}-accept-title`} className="font-medium">
            Confirm acceptance
          </h5>
          <p className="mt-1 text-sm text-muted-foreground">
            I acknowledge that this is generated advice and confirm that the organisation intends to
            take it forward. An action will be created separately.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => submit("accepted", { acknowledged: true })}
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Confirm accept
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {mode === "defer" && (
        <div className="mt-3 rounded-lg border border-border p-3">
          <label htmlFor={reviewId} className="text-sm font-medium">
            Review date
          </label>
          <input
            id={reviewId}
            type="datetime-local"
            value={reviewAt}
            onChange={(event) => setReviewAt(event.target.value)}
            className="mt-2 block min-h-11 rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!reviewAt || mutation.isPending}
              onClick={() => submit("deferred", { reviewAt: new Date(reviewAt).toISOString() })}
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Confirm defer
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {mode === "reject" && (
        <div
          role="group"
          aria-labelledby={`${reasonId}-title`}
          aria-describedby={`${reasonId}-description`}
          className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
        >
          <h5 id={`${reasonId}-title`} className="font-medium">
            Confirm that this advice will not be taken forward
          </h5>
          <p id={`${reasonId}-description`} className="mt-1 text-sm text-muted-foreground">
            The generated recommendation remains unchanged in the audit history.
          </p>
          <label htmlFor={reasonId} className="mt-3 block text-sm font-medium">
            Reason
          </label>
          <select
            id={reasonId}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as RecommendationDecisionReasonCategory)
            }
            className="mt-2 min-h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            {reasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => submit("rejected", { reasonCategory: reason })}
              className="min-h-11 rounded-lg bg-destructive px-3 text-sm font-medium text-destructive-foreground"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {mode === "idle" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {decision.availableActions.includes("accepted") && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setMode("accept")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              <Check className="h-4 w-4" aria-hidden />
              Accept
            </button>
          )}
          {decision.availableActions.includes("deferred") && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setMode("defer")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <Clock3 className="h-4 w-4" aria-hidden />
              Defer
            </button>
          )}
          {decision.availableActions.includes("rejected") && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setMode("reject")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <X className="h-4 w-4" aria-hidden />
              Reject
            </button>
          )}
          {decision.availableActions.includes("restored") && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => submit("restored")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Restore to undecided
            </button>
          )}
        </div>
      )}
    </div>
  );
}
