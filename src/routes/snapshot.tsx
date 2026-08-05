import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft, Loader2, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { SignalConverge, SignalField } from "@/components/brand/signal-converge";
import { SnapshotPreparation } from "@/components/delivery-dna/snapshot-preparation";
import { SnapshotRadar } from "@/components/delivery-dna/snapshot-radar";
import { SnapshotAcquisitionShell } from "@/components/delivery-dna/snapshot-shell";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-identity";
import { deliveryDnaV2Catalogue } from "@/lib/delivery-dna/catalogue-v2";
import { deliveryDnaSnapshotApi, type SnapshotState } from "@/lib/delivery-dna/snapshot-client";
import { deliveryDnaOverviewApi } from "@/lib/delivery-dna/overview-client";
import { deliveryDnaCommercialCopy } from "@/lib/delivery-dna/overview-offer";
import {
  deliveryDnaSnapshotV2Configuration,
  deliveryDnaSnapshotV2Questions,
  snapshotV2AnswerOptions,
} from "@/lib/delivery-dna/snapshot-v2";
import type { DeliveryDnaV2Level } from "@/lib/delivery-dna/catalogue-v2";

export const Route = createFileRoute("/snapshot")({
  validateSearch: (search: Record<string, unknown>) => {
    const checkout =
      search.checkout === "success" || search.checkout === "cancelled"
        ? (search.checkout as "success" | "cancelled")
        : undefined;
    return {
      continue: search.continue === "1" || search.continue === true,
      ...(checkout ? { checkout } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Delivery DNA Snapshot — DeliveryIQ" },
      {
        name: "description",
        content:
          "Answer 15 anchored questions for an indicative view of your organisation's delivery practices.",
      },
    ],
  }),
  component: DeliveryDnaSnapshotPage,
});

const snapshotPolicy = deliveryDnaSnapshotV2Configuration;
const copy = {
  startHeading: "See the delivery patterns shaping your organisation",
  introduction:
    "Answer one Snapshot question from each Delivery DNA capability to build a directional five-domain view.",
  timeEstimate: "6–8 minutes",
  instructions:
    "Choose the anchored statement that best reflects usual project and change delivery practice across the organisation or area in scope.",
  insufficientHeading: "We need a little more evidence",
  insufficientBody:
    "Answer at least 12 questions, including two in every domain, to prepare your Snapshot.",
  readyHeading: "Your Snapshot is ready",
  resultHeading: "Your indicative delivery maturity",
  interpretationHeading: "What this means",
  profileHeading: "Your indicative Delivery DNA profile",
  profileBody:
    "This chart shows the directional level for each domain. Not applicable responses remain visible gaps.",
  positiveHeading: deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.areasOfStrength.heading,
  positiveHelper:
    deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.areasOfStrength.helperText,
  exploreHeading: deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.areasToExploreHeading,
  resultCaveat: deliveryDnaV2Catalogue.snapshotPolicy.mandatoryCaveat,
  restartCta: "Start a new Snapshot",
};
const interaction = deliveryDnaSnapshotV2Configuration.interactionPolicy;
const savedSnapshotCopy = deliveryDnaSnapshotV2Configuration.copy;
const maturityLevels: Record<DeliveryDnaV2Level, { label: string; interpretation: string }> = {
  emerging: {
    label: "Emerging",
    interpretation:
      deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.interpretations.emerging,
  },
  developing: {
    label: "Developing",
    interpretation:
      deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.interpretations.developing,
  },
  established: {
    label: "Established",
    interpretation:
      deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.interpretations.established,
  },
  leading: {
    label: "Leading",
    interpretation:
      deliveryDnaV2Catalogue.snapshotPolicy.resultPresentation.interpretations.leading,
  },
};

type SaveInput = {
  questionId: string;
  status: "answered" | "not_applicable";
  answer?: number | null;
  notApplicableReasonText?: string | null;
};

function DeliveryDnaSnapshotPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: identityLoading } = useIdentity();
  const [preparing, setPreparing] = useState(false);
  const handlePreparationReady = useCallback(() => setPreparing(false), []);
  const { data, isLoading, error } = useQuery({
    queryKey: ["delivery-dna-snapshot"],
    queryFn: deliveryDnaSnapshotApi.get,
    retry: false,
  });
  const start = useMutation({
    mutationFn: (scope: { scopeType: string; scopeDisplayName: string }) =>
      deliveryDnaSnapshotApi.start(false, scope),
    onSuccess: (value) => queryClient.setQueryData(["delivery-dna-snapshot"], value),
  });
  const restart = useMutation({
    mutationFn: (scope: { scopeType: string; scopeDisplayName: string }) =>
      deliveryDnaSnapshotApi.start(true, scope),
    onSuccess: (value) => {
      setPreparing(false);
      queryClient.setQueryData(["delivery-dna-snapshot"], value);
    },
  });

  const snapshot = data?.snapshot ?? null;
  const search = Route.useSearch();
  return (
    <SnapshotAcquisitionShell>
      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center" role="status">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Loading your Delivery DNA Snapshot</span>
        </div>
      ) : error ? (
        <SnapshotError message={error.message} />
      ) : !snapshot ? (
        <SnapshotStart
          busy={start.isPending}
          error={start.error?.message}
          onStart={(scope) => start.mutate(scope)}
        />
      ) : preparing ? (
        <SnapshotPreparation onReady={handlePreparationReady} />
      ) : snapshot.status === "completed" || snapshot.status === "linked" ? (
        <SnapshotResultView
          snapshot={snapshot}
          isAuthenticated={isAuthenticated}
          identityLoading={identityLoading}
          restarting={restart.isPending}
          restartError={restart.error?.message}
          onRestart={() =>
            restart.mutate({
              scopeType: snapshot.scopeType,
              scopeDisplayName: snapshot.scopeDisplayName,
            })
          }
          checkoutState={search.checkout}
        />
      ) : (
        <SnapshotQuestions snapshot={snapshot} onPrepare={() => setPreparing(true)} />
      )}
    </SnapshotAcquisitionShell>
  );
}

function SnapshotStart({
  busy,
  error,
  onStart,
}: {
  busy: boolean;
  error?: string;
  onStart: (scope: { scopeType: string; scopeDisplayName: string }) => void;
}) {
  const [scopeType, setScopeType] = useState("whole_organisation");
  const [scopeDisplayName, setScopeDisplayName] = useState("");
  return (
    <section className="panel relative overflow-hidden rounded-[22px] px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
      <SignalField />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-rise">
          <p className="eyebrow">Delivery DNA Snapshot</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {String(copy.startHeading)}
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground sm:text-lg">
            {String(copy.introduction)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-4 py-2">
              15 questions
            </span>
            <span className="rounded-full border border-border bg-muted px-4 py-2">
              {String(copy.timeEstimate)}
            </span>
            <span className="rounded-full border border-border bg-muted px-4 py-2">
              No account required
            </span>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {String(copy.instructions)}
          </p>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-7 grid max-w-2xl gap-4 rounded-[18px] border border-border bg-panel p-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground">
              Assessment scope
              <select
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-[10px] border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="whole_organisation">Whole organisation</option>
                <option value="business_unit_or_division">Business unit or division</option>
                <option value="function">Function</option>
                <option value="defined_delivery_portfolio_or_delivery_system">
                  Delivery portfolio or system
                </option>
              </select>
            </label>
            <label className="text-sm font-semibold text-foreground">
              Organisation or area name
              <input
                value={scopeDisplayName}
                maxLength={120}
                onChange={(event) => setScopeDisplayName(event.target.value)}
                placeholder="e.g. UK Operations"
                className="mt-2 min-h-11 w-full rounded-[10px] border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            For this assessment, “the organisation” means{" "}
            {scopeDisplayName.trim() || "the scope named above"}. Answer for how project and change
            delivery usually works across this scope today.
          </p>
          <Button
            className="mt-7 min-h-12 gap-2 px-6"
            disabled={busy || scopeDisplayName.trim().length < 2}
            onClick={() => onStart({ scopeType, scopeDisplayName: scopeDisplayName.trim() })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Start your Snapshot <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Evidence-informed. Explainable. Human-controlled.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No personal name, email or account is requested. The scope name is used only for this
            Snapshot, and an unfinished Snapshot expires after 24 hours.
          </p>
        </div>
        <SignalConverge className="mx-auto hidden max-w-lg lg:block" />
      </div>
    </section>
  );
}

function SnapshotQuestions({
  snapshot,
  onPrepare,
}: {
  snapshot: SnapshotState;
  onPrepare: () => void;
}) {
  const queryClient = useQueryClient();
  const initialIndex = Math.max(
    0,
    (() => {
      const recorded = new Set(snapshot.responses.map((response) => response.questionId));
      const next = deliveryDnaSnapshotV2Questions.findIndex(
        (question) => !recorded.has(question.question.id),
      );
      return next === -1 ? 14 : next;
    })(),
  );
  const [index, setIndex] = useState(initialIndex);
  const [reason, setReason] = useState("");
  const [selectingNotApplicable, setSelectingNotApplicable] = useState(false);
  const [localAnswer, setLocalAnswer] = useState<number | null>(null);
  const [failedInput, setFailedInput] = useState<SaveInput | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const responses = useMemo(
    () => new Map(snapshot.responses.map((response) => [response.questionId, response])),
    [snapshot.responses],
  );
  const item = deliveryDnaSnapshotV2Questions[index];
  const current = responses.get(item.question.id);

  useEffect(() => {
    setReason(current?.notApplicableReasonText ?? "");
    setSelectingNotApplicable(current?.status === "not_applicable");
    setLocalAnswer(null);
    setFailedInput(null);
    headingRef.current?.focus();
  }, [current?.notApplicableReasonText, current?.status, item.question.id]);

  const save = useMutation({
    mutationFn: deliveryDnaSnapshotApi.save,
    onSuccess: (value) => {
      queryClient.setQueryData(["delivery-dna-snapshot"], value);
      setCompletionError(null);
    },
  });

  const move = useCallback((next: number) => setIndex(Math.min(14, Math.max(0, next))), []);

  const commit = useCallback(
    async (input: SaveInput) => {
      const selectedAt = performance.now();
      setFailedInput(null);
      if (input.status === "answered") {
        setLocalAnswer(Number(input.answer));
        setSelectingNotApplicable(false);
      }
      try {
        const value = await save.mutateAsync(input);
        const remaining = Math.max(
          0,
          interaction.selectionConfirmationMilliseconds - (performance.now() - selectedAt),
        );
        if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
        setFailedInput(null);
        if (index === 14) {
          const answered = value.snapshot.responses.filter(
            (response) => response.status === "answered",
          );
          const answeredIds = new Set(answered.map((response) => response.questionId));
          const domainCoverage = new Map<string, number>();
          for (const question of deliveryDnaSnapshotV2Questions) {
            if (answeredIds.has(question.question.id)) {
              domainCoverage.set(
                question.domainId,
                (domainCoverage.get(question.domainId) ?? 0) + 1,
              );
            }
          }
          if (
            value.snapshot.responses.length === 15 &&
            answered.length >= 12 &&
            deliveryDnaV2Catalogue.domains.every(
              (domain) => (domainCoverage.get(domain.id) ?? 0) >= 2,
            )
          ) {
            onPrepare();
          } else {
            setCompletionError(copy.insufficientBody);
          }
          return;
        }
        move(index + 1);
      } catch {
        setFailedInput(input);
      }
    },
    [index, move, onPrepare, save],
  );

  const selectedAnswer =
    localAnswer ??
    (!selectingNotApplicable && current?.status === "answered" ? current.answer : null);
  const answeredCount = snapshot.responses.filter(
    (response) => response.status === "answered",
  ).length;
  const savedCount = snapshot.responses.length;

  const handleArrow = (event: ReactKeyboardEvent<HTMLButtonElement>, optionIndex: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (optionIndex + direction + 4) % 4;
    optionRefs.current[next]?.focus();
  };

  return (
    <section className="on-navy -mx-5 rounded-none px-5 py-8 sm:-mx-8 sm:rounded-[22px] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Delivery DNA Snapshot</p>
        <p className="mt-3 rounded-[14px] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          For this assessment, “the organisation” means <strong>{snapshot.scopeDisplayName}</strong>
          . Answer for how project and change delivery usually works across this scope today.
        </p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{item.capabilityLabel}</p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 text-2xl font-extrabold leading-tight outline-none sm:text-3xl"
            >
              {item.question.prompt}
            </h1>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Question {index + 1} of 15
        </p>
        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Snapshot progress"
          aria-valuemin={0}
          aria-valuemax={15}
          aria-valuenow={savedCount}
        >
          <div
            className="h-full rounded-full bg-[image:var(--signal-line)] transition-[width] duration-500"
            style={{ width: `${(savedCount / 15) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Question {index + 1} of 15 · {snapshot.responses.length} saved
        </p>

        <fieldset className="panel mt-7 p-5 sm:p-7" disabled={save.isPending}>
          <legend className="sr-only">{item.question.prompt}</legend>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.customerHelp}</p>

          <div
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="radiogroup"
            aria-label="Choose the response that best reflects your organisation"
            aria-busy={save.isPending}
            onKeyDown={(event) => {
              if (
                !save.isPending &&
                ["1", "2", "3", "4"].includes(event.key) &&
                !(event.target instanceof HTMLTextAreaElement)
              ) {
                event.preventDefault();
                const answer = Number(event.key);
                void commit({
                  questionId: item.question.id,
                  status: "answered",
                  answer,
                });
              }
            }}
          >
            {snapshotV2AnswerOptions(item.question.id).map((option, optionIndex) => {
              const selected = selectedAnswer === option.value && !selectingNotApplicable;
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[optionIndex] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onKeyDown={(event) => handleArrow(event, optionIndex)}
                  onClick={() =>
                    void commit({
                      questionId: item.question.id,
                      status: "answered",
                      answer: option.value,
                    })
                  }
                  className={`card-lift h-full min-h-32 rounded-[14px] border p-4 text-left ${
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-muted hover:border-primary/40"
                  }`}
                >
                  <span className="mt-2 block text-sm font-bold text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[14px] border border-border bg-muted p-4">
            <button
              type="button"
              aria-pressed={selectingNotApplicable}
              className="flex min-h-11 w-full items-center gap-3 text-left text-sm font-semibold text-foreground"
              onClick={() => {
                setLocalAnswer(null);
                setSelectingNotApplicable(true);
                setFailedInput(null);
              }}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectingNotApplicable ? "border-primary bg-primary" : "border-input"
                }`}
                aria-hidden="true"
              >
                {selectingNotApplicable ? (
                  <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                ) : null}
              </span>
              Not applicable
            </button>
            {selectingNotApplicable ? (
              <div className="mt-4">
                <label
                  htmlFor="snapshot-na-reason"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Why is this not applicable to the organisation in scope?
                </label>
                <textarea
                  id="snapshot-na-reason"
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 min-h-24 w-full rounded-[14px] border border-input bg-background p-3 text-sm text-foreground"
                />
                <Button
                  variant="secondary"
                  className="mt-3 min-h-11"
                  disabled={!reason.trim() || save.isPending}
                  onClick={() =>
                    void commit({
                      questionId: item.question.id,
                      status: "not_applicable",
                      answer: null,
                      notApplicableReasonText: reason,
                    })
                  }
                >
                  Save and continue
                </Button>
              </div>
            ) : null}
          </div>

          {save.isPending ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving your response
            </p>
          ) : null}
          {save.error ? (
            <div
              className="mt-4 rounded-[14px] border border-destructive/40 bg-destructive/15 p-4"
              role="alert"
            >
              <p className="text-sm text-foreground">
                We couldn’t save that response. Your selection is still here.
              </p>
              {failedInput ? (
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void commit(failedInput)}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Try again
                </Button>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={index === 0 || save.isPending}
            onClick={() => move(index - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {snapshot.responses.length} recorded · {answeredCount} applicable
          </div>
          {index < 14 && current && !save.isPending ? (
            <Button variant="ghost" onClick={() => move(index + 1)}>
              Continue with saved answer <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <span aria-hidden />
          )}
        </div>

        {completionError ? (
          <div className="mt-6 rounded-[18px] border border-border bg-panel p-5" role="alert">
            <h2 className="font-bold">{String(copy.insufficientHeading)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{completionError}</p>
          </div>
        ) : null}
      </div>
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
  checkoutState,
}: {
  snapshot: SnapshotState;
  isAuthenticated: boolean;
  identityLoading: boolean;
  restarting: boolean;
  restartError?: string;
  onRestart: () => void;
  checkoutState?: "success" | "cancelled";
}) {
  const queryClient = useQueryClient();
  const [consent, setConsent] = useState(false);
  const continuation = useMutation({
    mutationFn: () => deliveryDnaSnapshotApi.continue(consent),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-dna-snapshot"] });
    },
  });
  const assessmentId = snapshot.linkedAssessmentId;
  const access = useQuery({
    queryKey: ["delivery-dna-overview-access", assessmentId],
    queryFn: () => deliveryDnaOverviewApi.access(assessmentId!),
    enabled: Boolean(isAuthenticated && assessmentId),
    refetchInterval: (query) =>
      checkoutState === "success" && !query.state.data?.permitted ? 2_000 : false,
  });
  const checkout = useMutation({
    mutationFn: () => deliveryDnaOverviewApi.checkout(assessmentId!),
    onSuccess: (value) => {
      if (value.status === "already_available" && value.destination) {
        window.location.assign(value.destination);
      } else if (value.checkoutUrl) {
        window.location.assign(value.checkoutUrl);
      }
    },
  });
  const download = useMutation({ mutationFn: deliveryDnaSnapshotApi.download });
  const result = snapshot.result;
  if (!result?.available || !result.indicativeMaturityLevel) {
    return <SnapshotError message={String(copy.insufficientBody)} />;
  }
  const maturity = maturityLevels[result.indicativeMaturityLevel];

  return (
    <section className="mx-auto max-w-5xl">
      <section className="on-navy relative overflow-hidden rounded-[22px] px-6 py-10 text-center sm:px-10 sm:py-14">
        <SignalField />
        <SignalConverge className="relative mx-auto max-w-md" />
        <p className="eyebrow relative mt-4">{String(copy.readyHeading)}</p>
        <h1 className="relative mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
          {String(copy.resultHeading)}
        </h1>
        <p className="relative mt-5 break-words px-2 py-2 font-display text-5xl font-extrabold leading-[1.15] tracking-tight text-primary sm:text-6xl">
          {maturity.label}
        </p>
        <div className="relative mx-auto mt-7 max-w-3xl border-t border-border pt-6 text-left">
          <h2 className="text-xl font-extrabold">{String(copy.interpretationHeading)}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{maturity.interpretation}</p>
        </div>
      </section>

      <p className="panel mt-6 p-5 text-sm leading-relaxed text-muted-foreground">
        {copy.resultCaveat}
      </p>

      {snapshot.status !== "linked" ? (
        <section className="mt-6 flex flex-col items-start gap-4 rounded-[18px] border border-primary/40 bg-accent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-bold text-foreground">{savedSnapshotCopy.saveSupporting}</p>
            <p className="mt-1 text-sm text-muted-foreground">{savedSnapshotCopy.saveAssurance}</p>
          </div>
          <a
            href="#snapshot-save-panel"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[14px] bg-primary px-6 text-sm font-bold text-primary-foreground"
          >
            {savedSnapshotCopy.saveAction}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </section>
      ) : null}

      <section
        className="on-navy mt-7 rounded-[22px] p-5 sm:p-8"
        aria-labelledby="snapshot-profile-title"
      >
        <h2 id="snapshot-profile-title" className="text-2xl font-extrabold tracking-tight">
          {String(copy.profileHeading)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{String(copy.profileBody)}</p>
        <div className="mt-4">
          <SnapshotRadar profile={result.profile} />
        </div>
      </section>

      {result.positiveSignals.length || result.areasToExplore.length ? (
        <div
          className={`mt-7 grid gap-5 ${
            result.positiveSignals.length && result.areasToExplore.length ? "md:grid-cols-2" : ""
          }`}
        >
          {result.positiveSignals.length ? (
            <SignalGroup
              title={String(copy.positiveHeading)}
              helper={String(copy.positiveHelper)}
              items={result.positiveSignals}
            />
          ) : null}
          {result.areasToExplore.length ? (
            <SignalGroup title={String(copy.exploreHeading)} items={result.areasToExplore} />
          ) : null}
        </div>
      ) : null}

      {result.industryContext?.[0] ? (
        <aside className="panel mt-7 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Industry context</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.industryContext[0].approvedCustomerWording}
            <sup className="ml-1">{result.industryContext[0].footnoteMarker}</sup>
          </p>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground">
            {result.industryContext[0].mandatoryDisclosure}
          </p>
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">
              About this source
            </summary>
            <p className="mt-2 leading-relaxed">{result.industryContext[0].scopeCaveat}</p>
          </details>
          <a
            href={result.industryContext[0].originalSourceReference}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground underline underline-offset-4"
          >
            {result.industryContext[0].sourceNote}
          </a>
        </aside>
      ) : null}

      <section
        id="snapshot-save-panel"
        className="panel mt-8 p-6 sm:p-9"
        aria-labelledby="snapshot-continue-title"
      >
        <p className="eyebrow">Delivery DNA Overview</p>

        {snapshot.status === "linked" && assessmentId ? (
          <>
            <h2 id="snapshot-continue-title" className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {deliveryDnaCommercialCopy.savedState.heading}
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
              {deliveryDnaCommercialCopy.savedState.body}
            </p>
            <Button
              variant="secondary"
              className="mt-5 min-h-12"
              disabled={download.isPending}
              onClick={() => download.mutate()}
            >
              {download.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Download my Snapshot
            </Button>
            {download.error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {download.error.message}
              </p>
            ) : null}
            {!access.data?.permitted ? (
              <a
                href="#delivery-dna-overview-offer"
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-primary/50 px-5 text-sm font-bold text-foreground"
              >
                {deliveryDnaCommercialCopy.savedState.primaryAction}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
            <div
              id="delivery-dna-overview-offer"
              className="mt-6 scroll-mt-6 rounded-[18px] border border-border bg-panel p-5 sm:p-6"
            >
              <h3 className="text-xl font-extrabold">
                {deliveryDnaCommercialCopy.overviewOffer.heading}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {deliveryDnaCommercialCopy.overviewOffer.body}
              </p>
              <p className="mt-4 text-lg font-extrabold text-primary">
                {access.data?.offer?.displayPrice}
              </p>
              {access.data?.offer?.taxDisplay ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {access.data.offer.taxDisplay}
                </p>
              ) : null}
              {access.data?.permitted ? (
                <Button asChild className="mt-5 min-h-12 px-6">
                  <Link to="/assessment/$id" params={{ id: assessmentId }}>
                    {deliveryDnaCommercialCopy.purchasedState.primaryAction}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button
                  className="mt-5 min-h-12 px-6"
                  disabled={
                    checkout.isPending ||
                    access.isPending ||
                    access.isError ||
                    access.data?.offer?.checkoutAvailable !== true
                  }
                  onClick={() => checkout.mutate()}
                >
                  {checkout.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {deliveryDnaCommercialCopy.overviewOffer.purchaseAction}
                </Button>
              )}
              {checkoutState === "success" && !access.data?.permitted ? (
                <p className="mt-4 text-sm text-muted-foreground" role="status">
                  Payment confirmation is pending. Access appears only after the verified provider
                  event arrives.
                </p>
              ) : null}
              {checkoutState === "cancelled" ? (
                <p className="mt-4 text-sm text-muted-foreground" role="status">
                  Checkout was cancelled. Your Saved Snapshot is unchanged.
                </p>
              ) : null}
              {access.data?.safeStatus === "checkout_unavailable" ? (
                <p className="mt-4 text-sm text-muted-foreground" role="status">
                  Purchases are temporarily unavailable. Your Saved Snapshot is safe.
                </p>
              ) : null}
              {access.isError ? (
                <p className="mt-4 text-sm text-muted-foreground" role="status">
                  Purchases are temporarily unavailable. Your Saved Snapshot is safe.
                </p>
              ) : null}
              {checkout.error ? (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {checkout.error.message}
                </p>
              ) : null}
            </div>
          </>
        ) : identityLoading ? (
          <Loader2
            className="mt-6 h-5 w-5 animate-spin text-primary"
            aria-label="Checking account"
          />
        ) : !isAuthenticated ? (
          <>
            <h2 id="snapshot-continue-title" className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {savedSnapshotCopy.saveHeading}
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
              {savedSnapshotCopy.saveBody}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {deliveryDnaSnapshotV2Configuration.copy.saveBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 min-h-12 px-6">
              <Link
                to="/auth/register"
                search={{ snapshot: "continue", source: undefined, result: undefined }}
              >
                {savedSnapshotCopy.saveAction}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">{savedSnapshotCopy.saveAssurance}</p>
          </>
        ) : (
          <div className="mt-6">
            <h2 id="snapshot-continue-title" className="text-2xl font-extrabold sm:text-3xl">
              {savedSnapshotCopy.saveHeading}
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
              {savedSnapshotCopy.saveBody}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {deliveryDnaSnapshotV2Configuration.copy.saveBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[color:var(--primary)]"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I agree to save these 15 responses in my current DeliveryIQ workspace and link them
                to my Delivery DNA Overview. I understand the remaining questions stay locked until
                the Overview is purchased.
              </span>
            </label>
            <Button
              className="mt-5 min-h-12 px-6"
              disabled={!consent || continuation.isPending}
              onClick={() => continuation.mutate()}
            >
              {continuation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {savedSnapshotCopy.saveAction}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">{savedSnapshotCopy.saveAssurance}</p>
            {continuation.error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {continuation.error.message}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-border pt-6 text-center">
        <Button variant="ghost" disabled={restarting} onClick={onRestart}>
          {restarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {String(copy.restartCta)}
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
  helper,
  items,
}: {
  title: string;
  helper?: string;
  items: { domainId: string; domainLabel: string; text: string }[];
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {helper ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{helper}</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.domainId} className="rounded-[14px] border border-border bg-panel p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Check className="h-4 w-4 text-primary" aria-hidden /> {item.domainLabel}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SnapshotError({ message }: { message: string }) {
  return (
    <section className="panel mx-auto max-w-2xl p-6" role="alert">
      <h1 className="text-xl font-extrabold">We could not open your Delivery DNA Snapshot</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link to="/snapshot" search={{ continue: false }}>
          {String(copy.restartCta)}
        </Link>
      </Button>
    </section>
  );
}
