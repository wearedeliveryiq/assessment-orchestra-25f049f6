import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { QUESTIONNAIRE, TOTAL_QUESTIONS } from "@/lib/assessment/questionnaire";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/assessment/$id/")({
  head: () => ({
    meta: [
      { title: "Capture responses — DeliveryIQ" },
      {
        name: "description",
        content: "Capture delivery maturity responses section by section and submit for analysis.",
      },
      { property: "og:title", content: "Capture responses — DeliveryIQ" },
      {
        property: "og:description",
        content: "Capture delivery maturity responses section by section and submit for analysis.",
      },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => assessmentApi.get(id),
    enabled: hydrated,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const seededRef = useRef<string | null>(null);

  // Seed local state from the server exactly once per assessment. Re-seeding on
  // every refetch would clobber in-flight edits and snap the user back to the
  // last persisted section.
  useEffect(() => {
    if (!data || seededRef.current === id) return;
    seededRef.current = id;
    const next: Record<string, number> = {};
    for (const response of data.responses) {
      if (typeof response.value === "number") next[response.questionId] = response.value;
    }
    setAnswers(next);
    const index = QUESTIONNAIRE.findIndex((s) => s.id === data.session.currentSection);
    if (index >= 0) setSectionIndex(index);
  }, [data, id]);

  const section = QUESTIONNAIRE[sectionIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const save = useMutation({
    mutationFn: (options?: { silent?: boolean; sectionId?: string }) =>
      assessmentApi
        .save(id, {
          currentSection: options?.sectionId ?? section.id,
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        })
        .then((result) => ({ result, silent: options?.silent })),
    onSuccess: ({ silent }) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      if (!silent) toast.success("Draft saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const submit = useMutation({
    mutationFn: async () => {
      await assessmentApi.save(id, {
        currentSection: section.id,
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      });
      return assessmentApi.submit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      navigate({ to: "/assessment/$id/processing", params: { id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (error) {
    return (
      <AppShell>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      </AppShell>
    );
  }

  if (!hydrated || isLoading || !data) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessment…
        </div>
      </AppShell>
    );
  }

  const locked = !["draft", "in_progress"].includes(data.session.status);

  return (
    <AppShell action={<StatusPill status={data.session.status} />}>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All assessments
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.session.organisationName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {answeredCount} of {TOTAL_QUESTIONS} responses captured
          </p>
        </div>
        <div className="min-w-56 flex-1 sm:max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="ribbon-bar h-full transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[11px] tabular-nums text-muted-foreground">
            {progress}%
          </p>
        </div>
      </div>

      {locked && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          This assessment has been submitted and is read-only.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1.5">
          {QUESTIONNAIRE.map((item, index) => {
            const done = item.questions.every((q) => answers[q.id] !== undefined);
            return (
              <button
                key={item.id}
                onClick={() => setSectionIndex(index)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                  index === sectionIndex
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/70 bg-surface/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="truncate font-medium">{item.title}</span>
                {done && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
              </button>
            );
          })}
        </nav>

        <section className="ribbon-panel rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.intent}</p>

          <div className="mt-6 space-y-6">
            {section.questions.map((question) => (
              <fieldset key={question.id} disabled={locked}>
                <legend className="text-sm font-medium">{question.prompt}</legend>
                {question.helper && (
                  <p className="mt-1 text-xs text-muted-foreground">{question.helper}</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: option.value }))
                        }
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={sectionIndex === 0}
                onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={sectionIndex === QUESTIONNAIRE.length - 1}
                onClick={() => {
                  save.mutate(true);
                  setSectionIndex((i) => Math.min(QUESTIONNAIRE.length - 1, i + 1));
                }}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Next section
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked || save.isPending}
                onClick={() => save.mutate(false)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 disabled:opacity-50"
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save draft
              </button>
              <button
                type="button"
                disabled={locked || submit.isPending || answeredCount < TOTAL_QUESTIONS}
                onClick={() => submit.mutate()}
                className="ribbon-bar inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {submit.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit for analysis
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
