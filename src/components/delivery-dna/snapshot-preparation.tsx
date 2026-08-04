import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RibbonStage } from "@/components/ribbon";
import { Button } from "@/components/ui/button";
import { deliveryDnaSnapshotApi } from "@/lib/delivery-dna/snapshot-client";
import { deliveryDnaSnapshotConfiguration } from "@/lib/delivery-dna/snapshot";

const policy = deliveryDnaSnapshotConfiguration.preparationPolicy;
const copy = deliveryDnaSnapshotConfiguration.copy;

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

  return (
    <section
      className="snapshot-acquisition-panel mx-auto max-w-3xl rounded-[28px] px-6 py-10 text-center sm:px-10 sm:py-14"
      role="status"
      aria-live="polite"
    >
      <RibbonStage size="md" className="mx-auto" onNavy />
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-[#14B8A6]">
        Delivery DNA Snapshot
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {showReady ? String(copy.readyHeading) : String(copy.preparationHeading)}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
        {slow ? String(copy.slowPreparationBody) : String(copy.preparationBody)}
      </p>

      <ol className="mx-auto mt-8 max-w-xl space-y-3 text-left">
        {policy.steps.map((step, index) => {
          const completeStep = resultReady || index < activeStep;
          const current = !resultReady && index === activeStep;
          return (
            <li
              key={step.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                {completeStep ? (
                  <Check className="h-5 w-5 text-[#14B8A6]" />
                ) : current ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#60A5FA]" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </span>
              <span className={completeStep || current ? "text-[#F8FAFC]" : "text-[#94A3B8]"}>
                {step.copy}
              </span>
            </li>
          );
        })}
      </ol>

      {complete.error ? (
        <div className="mt-7 rounded-xl border border-red-400/30 bg-red-400/10 p-4" role="alert">
          <p className="text-sm text-[#F8FAFC]">
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
