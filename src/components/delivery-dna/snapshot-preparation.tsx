import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SignalConverge, SignalField } from "@/components/brand/signal-converge";
import { Button } from "@/components/ui/button";
import { deliveryDnaSnapshotApi } from "@/lib/delivery-dna/snapshot-client";
import { deliveryDnaSnapshotV2Configuration } from "@/lib/delivery-dna/snapshot-v2";

const policy = deliveryDnaSnapshotV2Configuration.preparationPolicy;

export function SnapshotPreparation({ onReady }: { onReady: () => void }) {
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const startedAt = useRef(Date.now());
  const requested = useRef(false);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complete = useMutation({
    mutationFn: deliveryDnaSnapshotApi.complete,
    onSuccess: (value) => {
      if (!value.result.available) return;
      queryClient.setQueryData(["delivery-dna-snapshot"], { snapshot: value.snapshot });
      setResultReady(true);
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    complete.mutate();
  }, [complete]);

  useEffect(() => {
    if (!resultReady || elapsed < policy.minimumVisibleMilliseconds || showReady) return;
    setShowReady(true);
  }, [elapsed, resultReady, showReady]);

  useEffect(() => {
    if (!showReady) return;
    finishTimer.current = setTimeout(onReady, 700);
    return () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
    };
  }, [onReady, showReady]);

  const activeStep = Math.min(policy.steps.length - 1, Math.floor(elapsed / 800));
  const slow = elapsed >= policy.slowStateAtMilliseconds && !resultReady;
  const displayedStep = showReady ? policy.steps.length - 1 : activeStep;

  return (
    <section
      className="on-navy panel relative mx-auto max-w-3xl overflow-hidden rounded-[22px] px-6 py-10 text-center sm:px-10 sm:py-14"
      role="status"
      aria-live="polite"
    >
      <SignalField />
      <div className="relative mx-auto w-fit">
        <div
          className="snapshot-preparation-orbit absolute inset-[-22px] rounded-full border border-primary/25"
          aria-hidden="true"
        />
        <SignalConverge className="relative mx-auto max-w-md" />
      </div>
      <p className="eyebrow relative mt-4">Delivery DNA Snapshot</p>
      <h1 className="relative mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {showReady ? policy.ready : slow ? policy.delayedHeading : policy.heading}
      </h1>
      <p className="relative mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
        {policy.body}
      </p>

      <ol
        className="snapshot-domain-flow relative mx-auto mt-8 flex max-w-xl items-center justify-between gap-2"
        aria-label="Snapshot preparation progress"
      >
        {policy.steps.map((step, index) => {
          const completeStep = resultReady || index < activeStep;
          const current = !resultReady && index === activeStep;
          return (
            <li
              key={step}
              className="snapshot-domain-flow-node relative flex flex-1 justify-center"
              data-state={completeStep ? "complete" : current ? "active" : "waiting"}
            >
              <span
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-panel"
                aria-label={`${step}: ${completeStep ? "complete" : current ? "in progress" : "waiting"}`}
              >
                {completeStep ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : current ? (
                  <span className="snapshot-preparation-pulse h-3 w-3 rounded-full bg-primary" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="relative mx-auto mt-5 max-w-xl rounded-[14px] border border-border bg-muted px-4 py-4 text-left">
        <p className="flex items-center gap-3 text-sm font-semibold text-foreground">
          {showReady ? (
            <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          )}
          {policy.steps[displayedStep]}
        </p>
      </div>

      {complete.error ? (
        <div
          className="relative mt-7 rounded-[14px] border border-destructive/40 bg-destructive/15 p-4"
          role="alert"
        >
          <p className="text-sm text-foreground">
            We couldn’t finish preparing your Snapshot. Your saved responses are safe.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              startedAt.current = Date.now();
              setElapsed(0);
              complete.mutate();
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Retry preparation
          </Button>
        </div>
      ) : null}
    </section>
  );
}
