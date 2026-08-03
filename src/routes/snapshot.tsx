import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { IdentityMenu } from "@/components/identity/identity-menu";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-identity";
import { deliveryDnaSnapshotApi, type SnapshotState } from "@/lib/delivery-dna/snapshot-client";
import {
  deliveryDnaSnapshotConfiguration,
  deliveryDnaSnapshotQuestions,
} from "@/lib/delivery-dna/snapshot";
import { deliveryDnaCatalogue } from "@/lib/delivery-dna/catalogue";

export const Route = createFileRoute("/snapshot")({
  validateSearch: (search: Record<string, unknown>) => ({
    continue: search.continue === "1" || search.continue === true,
  }),
  head: () => ({
    meta: [
      { title: "Delivery DNA Snapshot — DeliveryIQ" },
      {
        name: "description",
        content:
          "Answer 13 quick questions for a directional view of your organisation's delivery practices.",
      },
    ],
  }),
  component: DeliveryDnaSnapshotPage,
});

const copy = deliveryDnaSnapshotConfiguration.copy;

function DeliveryDnaSnapshotPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: identityLoading } = useIdentity();
  const { data, isLoading, error } = useQuery({
    queryKey: ["delivery-dna-snapshot"],
    queryFn: deliveryDnaSnapshotApi.get,
    retry: false,
  });
  const start = useMutation({
    mutationFn: () => deliveryDnaSnapshotApi.start(),
    onSuccess: (value) => queryClient.setQueryData(["delivery-dna-snapshot"], value),
  });
  const restart = useMutation({
    mutationFn: () => deliveryDnaSnapshotApi.start(true),
    onSuccess: (value) => queryClient.setQueryData(["delivery-dna-snapshot"], value),
  });

  const snapshot = data?.snapshot ?? null;
  return (
    <AppShell action={<IdentityMenu />}>
      <main className="mx-auto max-w-4xl" aria-live="polite">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            <span className="sr-only">Loading your Delivery DNA Snapshot</span>
          </div>
        ) : error ? (
          <SnapshotError message={error.message} />
        ) : !snapshot ? (
          <SnapshotStart
            busy={start.isPending}
            error={start.error?.message}
            onStart={() => start.mutate()}
          />
        ) : snapshot.status === "completed" || snapshot.status === "linked" ? (
          <SnapshotResultView
            snapshot={snapshot}
            isAuthenticated={isAuthenticated}
            identityLoading={identityLoading}
            restarting={restart.isPending}
            restartError={restart.error?.message}
            onRestart={() => restart.mutate()}
          />
        ) : (
          <SnapshotQuestions snapshot={snapshot} />
        )}
      </main>
    </AppShell>
  );
}

function SnapshotStart({
  busy,
  error,
  onStart,
}: {
  busy: boolean;
  error?: string;
  onStart: () => void;
}) {
  return (
    <section className="ribbon-panel rounded-xl px-6 py-10 sm:px-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Delivery DNA Snapshot
      </p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{String(copy.startHeading)}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {String(copy.introduction)}
      </p>
      <p className="mt-3 text-sm font-medium">{String(copy.timeEstimate)}</p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {String(copy.instructions)}
      </p>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="mt-6 gap-2" disabled={busy} onClick={onStart}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Start your Snapshot <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      <p className="mt-5 text-xs text-muted-foreground">
        No name, email, organisation or account is requested. An unfinished Snapshot expires after
        24 hours.
      </p>
    </section>
  );
}

function SnapshotQuestions({ snapshot }: { snapshot: SnapshotState }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [reason, setReason] = useState("");
  const [selectingNotApplicable, setSelectingNotApplicable] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const responses = useMemo(
    () => new Map(snapshot.responses.map((response) => [response.questionId, response])),
    [snapshot.responses],
  );
  const item = deliveryDnaSnapshotQuestions[index];
  const current = responses.get(item.question.id);
  useEffect(() => {
    setReason(current?.notApplicableReasonText ?? "");
    setSelectingNotApplicable(current?.status === "not_applicable");
  }, [current?.notApplicableReasonText, current?.status, item.question.id]);

  const save = useMutation({
    mutationFn: deliveryDnaSnapshotApi.save,
    onSuccess: (value) => {
      queryClient.setQueryData(["delivery-dna-snapshot"], value);
      setCompletionError(null);
    },
  });
  const complete = useMutation({
    mutationFn: deliveryDnaSnapshotApi.complete,
    onSuccess: (value) => {
      queryClient.setQueryData(["delivery-dna-snapshot"], { snapshot: value.snapshot });
      if (!value.result.available) setCompletionError(String(copy.insufficientBody));
    },
  });
  const allDeliberate = snapshot.responses.length === 13;
  const answeredCount = snapshot.responses.filter(
    (response) => response.status === "answered",
  ).length;
  const progress = Math.round((snapshot.responses.length / 13) * 100);

  const move = (next: number) => setIndex(Math.min(12, Math.max(0, next)));
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Delivery DNA Snapshot
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.capabilityLabel}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Question {index + 1} of 13</p>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{progress}%</span>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
        aria-label={`${progress}% complete`}
      >
        <div className="ribbon-bar h-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <fieldset className="ribbon-panel mt-6 rounded-xl p-5 sm:p-7" disabled={save.isPending}>
        <legend className="px-1 text-base font-semibold leading-relaxed sm:text-lg">
          {item.question.prompt}
        </legend>
        <p className="mt-2 text-sm text-muted-foreground">
          {deliveryDnaCatalogue.journey.dimensionLabels.practice}:{" "}
          {deliveryDnaCatalogue.journey.dimensionInstructions.practice}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {deliveryDnaCatalogue.journey.responseScale.options.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                current?.status === "answered" && current.answer === option.value
                  ? "border-primary bg-primary/15"
                  : "border-border bg-surface/60 hover:border-primary/40"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name={item.question.id}
                checked={
                  !selectingNotApplicable &&
                  current?.status === "answered" &&
                  current.answer === option.value
                }
                onChange={() => {
                  setSelectingNotApplicable(false);
                  save.mutate({
                    questionId: item.question.id,
                    status: "answered",
                    answer: option.value,
                  });
                }}
              />
              <span className="block font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                {option.description}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-border p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="radio"
              name={item.question.id}
              checked={selectingNotApplicable}
              onChange={() => setSelectingNotApplicable(true)}
            />
            {deliveryDnaCatalogue.journey.evidenceStatusPresentation.not_applicable.label}
          </label>
          {selectingNotApplicable && (
            <div className="mt-3">
              <label htmlFor="snapshot-na-reason" className="text-xs font-medium">
                {
                  deliveryDnaCatalogue.journey.evidenceStatusPresentation.not_applicable
                    .reasonPrompt
                }
              </label>
              <textarea
                id="snapshot-na-reason"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
              />
              <Button
                variant="secondary"
                className="mt-2"
                disabled={!reason.trim() || save.isPending}
                onClick={() =>
                  save.mutate({
                    questionId: item.question.id,
                    status: "not_applicable",
                    answer: null,
                    notApplicableReasonText: reason,
                  })
                }
              >
                Save Not applicable
              </Button>
            </div>
          )}
        </div>
        {save.error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {save.error.message}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={index === 0} onClick={() => move(index - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </Button>
        <div className="text-xs text-muted-foreground" aria-live="polite">
          {snapshot.responses.length} recorded · {answeredCount} applicable
        </div>
        {index < 12 ? (
          <Button variant="secondary" onClick={() => move(index + 1)}>
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button disabled={!allDeliberate || complete.isPending} onClick={() => complete.mutate()}>
            {complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            View your Snapshot
          </Button>
        )}
      </div>
      {completionError ? (
        <div className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4" role="alert">
          <h2 className="font-semibold">{String(copy.insufficientHeading)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{completionError}</p>
        </div>
      ) : null}
    </section>
  );
}

function SnapshotResultView({
  snapshot,
  isAuthenticated,
  identityLoading,
  restarting,
  restartError,
  onRestart,
}: {
  snapshot: SnapshotState;
  isAuthenticated: boolean;
  identityLoading: boolean;
  restarting: boolean;
  restartError?: string;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const continuation = useMutation({
    mutationFn: () => deliveryDnaSnapshotApi.continue(consent),
    onSuccess: ({ assessmentId }) =>
      navigate({ to: "/assessment/$id", params: { id: assessmentId } }),
  });
  const result = snapshot.result;
  if (!result?.available) return <SnapshotError message={String(copy.insufficientBody)} />;

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Delivery DNA Snapshot
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{String(copy.resultHeading)}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {String(copy.resultSummary)}
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <SignalGroup title="Positive signals" items={result.positiveSignals} />
        <SignalGroup title="Areas to explore" items={result.areasToExplore} />
      </div>
      <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-muted-foreground">
        {String(copy.resultCaveat)}
      </p>

      <section
        className="ribbon-panel mt-7 rounded-xl p-5 sm:p-7"
        aria-labelledby="snapshot-continue-title"
      >
        <h2 id="snapshot-continue-title" className="text-xl font-semibold">
          {String(copy.continuationCta)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {String(copy.registrationBody)}
        </p>
        {snapshot.status === "linked" && snapshot.linkedAssessmentId ? (
          <Button asChild className="mt-5">
            <Link to="/assessment/$id" params={{ id: snapshot.linkedAssessmentId }}>
              Review your carried responses <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : identityLoading ? (
          <Loader2
            className="mt-5 h-5 w-5 animate-spin text-primary"
            aria-label="Checking account"
          />
        ) : !isAuthenticated ? (
          <Button asChild className="mt-5">
            <Link
              to="/auth/register"
              search={{ snapshot: "continue", source: undefined, result: undefined }}
            >
              {String(copy.continuationCta)} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <div className="mt-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I agree to add these 13 responses to a Delivery DNA Assessment in my current
                workspace. I can review and change them before completing it.
              </span>
            </label>
            <Button
              className="mt-4"
              disabled={!consent || continuation.isPending}
              onClick={() => continuation.mutate()}
            >
              {continuation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {String(copy.continuationCta)}
            </Button>
            {continuation.error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {continuation.error.message}
              </p>
            ) : null}
          </div>
        )}
      </section>
      <div className="mt-6 border-t border-border pt-5">
        <Button variant="secondary" disabled={restarting} onClick={onRestart}>
          {restarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Start a new Snapshot
        </Button>
        {restartError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {restartError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SignalGroup({
  title,
  items,
}: {
  title: string;
  items: { capabilityId: string; capabilityLabel: string; text: string }[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.capabilityId} className="rounded-lg bg-surface p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Check className="h-4 w-4 text-primary" aria-hidden /> {item.capabilityLabel}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No directional signals to show here.</p>
      )}
    </section>
  );
}

function SnapshotError({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-card p-6" role="alert">
      <h1 className="text-xl font-semibold">We could not open your Delivery DNA Snapshot</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link to="/snapshot" search={{ continue: false }}>
          Start a new Snapshot
        </Link>
      </Button>
    </section>
  );
}
