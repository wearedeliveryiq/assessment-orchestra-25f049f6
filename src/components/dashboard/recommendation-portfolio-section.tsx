import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, RotateCcw, X } from "lucide-react";
import { useId, useState } from "react";

import {
  fetchRecommendationPortfolioDecisions,
  recordRecommendationDecision,
  type RecommendationDecisionView,
  type RecommendationPortfolioView,
} from "@/lib/recommendation-decisions/client";
import type { RecommendationDecisionReasonCategory } from "@/lib/recommendation-decisions/model";

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
    queryKey: ["recommendation-decisions", portfolio.portfolioId],
    queryFn: () => fetchRecommendationPortfolioDecisions(portfolio.portfolioId),
  });
  const decisions = new Map(
    query.data?.decisions.map((decision) => [decision.portfolioItemId, decision]) ?? [],
  );
  return (
    <section
      aria-labelledby="recommendation-portfolio-title"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Generated advice
      </p>
      <h2 id="recommendation-portfolio-title" className="mt-2 text-xl font-semibold">
        Recommendation portfolio
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Review the evidence-backed advice, then record your organisation’s decision separately.
      </p>
      {query.error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      <div className="mt-5 space-y-6">
        {portfolio.groups
          .filter((group) => group.recommendations.length > 0)
          .map((group) => (
            <section
              key={group.classification}
              aria-labelledby={`portfolio-${group.classification}`}
            >
              <h3 id={`portfolio-${group.classification}`} className="text-base font-semibold">
                {group.label}
              </h3>
              <ol className="mt-3 space-y-3">
                {group.recommendations.map((item) => (
                  <li key={item.portfolioItemId} className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.outcome}
                        </p>
                        <p className="mt-2 text-xs capitalize text-muted-foreground">
                          {item.priorityLabel} priority · {item.impact} impact · {item.effort}{" "}
                          effort
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                        {decisions.get(item.portfolioItemId)?.currentDecision ?? "undecided"}
                      </span>
                    </div>
                    {query.data && (
                      <RecommendationDecisionControls
                        decision={decisions.get(item.portfolioItemId)}
                        canDecide={query.data.canDecide}
                        portfolioId={portfolio.portfolioId}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        {!portfolio.groups.some((group) => group.recommendations.length > 0) && (
          <p className="text-sm text-muted-foreground">
            No action meets the approved recommendation rules.
          </p>
        )}
      </div>
    </section>
  );
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
      await queryClient.invalidateQueries({ queryKey: ["recommendation-decisions", portfolioId] });
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
