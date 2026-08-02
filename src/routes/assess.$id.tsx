import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Loader2,
  PauseCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { QuestionCard } from "@/components/runtime/question-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { runtimeApi, runtimeKeys, saveBeacon, type Answer } from "@/lib/runtime/client";
import { isVisible, validateQuestion } from "@/lib/runtime/validation";
import type { ResponseValue, RuntimeSnapshot, ValidationIssue } from "@/lib/runtime/types";

export const Route = createFileRoute("/assess/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Assessment in progress — DeliveryIQ Runtime" },
      {
        name: "description",
        content:
          "Answer assessment questions with automatic saving, inline validation and section-by-section progress tracking.",
      },
      { property: "og:title", content: "Assessment in progress — DeliveryIQ Runtime" },
      {
        property: "og:description",
        content: "Answer assessment questions with automatic saving and inline validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentPlayer,
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="rounded-lg border border-destructive/60 bg-destructive/10 p-4">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p>That assessment session no longer exists.</p>
    </AppShell>
  ),
});

type Draft = Record<string, ResponseValue>;

function AssessmentPlayer() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>({});
  const [issues, setIssues] = useState<Record<string, ValidationIssue[]>>({});
  const [pauseOpen, setPauseOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = useRef<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: runtimeKeys.session(id),
    queryFn: () => runtimeApi.get(id),
    enabled: hydrated,
  });

  useEffect(() => {
    if (!data) return;
    setDraft((current) => ({
      ...Object.fromEntries(data.responses.map((r) => [r.questionId, r.value])),
      ...current,
    }));
    setSavedAt(data.session.lastSavedAt);
  }, [data]);

  const pendingAnswers = useCallback((): Answer[] => {
    return [...dirty.current].map((questionId) => ({
      questionId,
      value: draft[questionId] ?? null,
    }));
  }, [draft]);

  const save = useMutation({
    mutationFn: (answers: Answer[]) =>
      runtimeApi.save(id, { answers, currentPageId: data?.navigation.currentPage?.id ?? null }),
    onSuccess: (snapshot) => {
      dirty.current.clear();
      setSavedAt(snapshot.session.lastSavedAt);
      queryClient.setQueryData(runtimeKeys.session(id), snapshot);
    },
    onError: (err: Error) => toast.error(`Could not save: ${err.message}`),
  });

  const move = useMutation({
    mutationFn: (direction: "next" | "previous") =>
      runtimeApi.navigate(id, { direction }, pendingAnswers()),
    onSuccess: (snapshot: RuntimeSnapshot) => {
      dirty.current.clear();
      queryClient.setQueryData(runtimeKeys.session(id), snapshot);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const jump = useMutation({
    mutationFn: (sectionId: string) =>
      runtimeApi.navigate(id, { direction: "section", sectionId }, pendingAnswers()),
    onSuccess: (snapshot: RuntimeSnapshot) => {
      dirty.current.clear();
      queryClient.setQueryData(runtimeKeys.session(id), snapshot);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const answers = pendingAnswers();
      if (answers.length > 0) await runtimeApi.save(id, { answers });
      return runtimeApi.complete(id);
    },
    onSuccess: () => {
      dirty.current.clear();
      void queryClient.invalidateQueries({ queryKey: runtimeKeys.session(id) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pause = useMutation({
    mutationFn: async () => {
      const answers = pendingAnswers();
      if (answers.length > 0) await runtimeApi.save(id, { answers });
      return runtimeApi.pause(id);
    },
    onSuccess: () => navigate({ to: "/assess" }),
    onError: (err: Error) => toast.error(err.message),
  });

  // Interval auto-save, configured by the assessment's own navigation metadata.
  const interval = data?.definition.navigation.autoSaveIntervalMs ?? 20_000;
  useEffect(() => {
    if (!data || data.session.locked) return;
    const timer = window.setInterval(() => {
      const answers = pendingAnswers();
      if (answers.length > 0 && !save.isPending) save.mutate(answers);
    }, interval);
    return () => window.clearInterval(timer);
  }, [data, interval, pendingAnswers, save]);

  // Never lose progress when the tab closes.
  useEffect(() => {
    const handler = () => saveBeacon(id, pendingAnswers(), data?.navigation.currentPage?.id ?? null);
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [id, pendingAnswers, data]);

  const page = data?.navigation.currentPage ?? null;
  const questions = useMemo(
    () => (page ? page.questions.filter((question) => isVisible(question, draft)) : []),
    [page, draft],
  );

  const onChange = (questionId: string, value: ResponseValue) => {
    setDraft((current) => ({ ...current, [questionId]: value }));
    dirty.current.add(questionId);
    const question = questions.find((candidate) => candidate.id === questionId);
    if (question) {
      setIssues((current) => ({ ...current, [questionId]: validateQuestion(question, value) }));
    }
  };

  const validatePage = () => {
    const next: Record<string, ValidationIssue[]> = {};
    for (const question of questions) {
      next[question.id] = validateQuestion(question, draft[question.id] ?? null);
    }
    setIssues(next);
    return Object.values(next).every((list) => list.length === 0);
  };

  if (error) {
    return (
      <AppShell>
        <p role="alert" className="rounded-lg border border-destructive/60 bg-destructive/10 p-4">
          {(error as Error).message}
        </p>
      </AppShell>
    );
  }

  if (!hydrated || isLoading || !data) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (data.session.status === "completed") {
    return <CompletionScreen snapshot={data} />;
  }

  const { progress, navigation, definition } = data;

  return (
    <AppShell
      action={
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {save.isPending ? (
            <>
              <CloudUpload className="h-3.5 w-3.5 animate-pulse" aria-hidden /> Saving…
            </>
          ) : savedAt ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> Saved{" "}
              {new Date(savedAt).toLocaleTimeString()}
            </>
          ) : (
            "Not saved yet"
          )}
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4" aria-label="Assessment progress">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {definition.name}
            </p>
            <Progress value={progress.percentComplete} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {progress.percentComplete}% · {progress.questionsAnswered}/
              {progress.totalQuestions} answered · ~{progress.estimatedMinutesRemaining} min left
            </p>
          </div>
          <nav aria-label="Sections">
            <ul className="space-y-1">
              {progress.sections.map((section) => (
                <li key={section.sectionId}>
                  <button
                    type="button"
                    onClick={() => jump.mutate(section.sectionId)}
                    aria-current={
                      section.sectionId === navigation.currentSectionId ? "step" : undefined
                    }
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      section.sectionId === navigation.currentSectionId
                        ? "bg-surface text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="block">{section.title}</span>
                    <span className="text-xs">
                      {section.answered}/{section.total}
                      {section.complete ? " · complete" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-5">
          <header>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {page?.title ?? progress.currentSectionTitle ?? definition.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Page {navigation.pageIndex + 1} of {navigation.pageCount}
              {page?.description ? ` · ${page.description}` : ""}
            </p>
          </header>

          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={navigation.pageIndex * questions.length + index + 1}
              value={draft[question.id] ?? null}
              issues={issues[question.id] ?? []}
              disabled={data.session.locked}
              onChange={(value) => onChange(question.id, value)}
            />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={!navigation.canGoPrevious || move.isPending}
                onClick={() => move.mutate("previous")}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
              </Button>
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => save.mutate(pendingAnswers())}
              >
                <Save className="h-4 w-4" aria-hidden /> Save
              </Button>
              <Button variant="ghost" onClick={() => setPauseOpen(true)}>
                <PauseCircle className="h-4 w-4" aria-hidden /> Pause
              </Button>
            </div>
            <div className="flex gap-2">
              {navigation.canGoNext ? (
                <Button
                  disabled={move.isPending}
                  onClick={() => {
                    if (!validatePage()) {
                      toast.error("Please resolve the highlighted questions first");
                      return;
                    }
                    move.mutate("next");
                  }}
                >
                  Next <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button disabled={complete.isPending} onClick={() => complete.mutate()}>
                  {complete.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  )}
                  Complete assessment
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause this assessment</DialogTitle>
            <DialogDescription>
              Your answers are saved. You can resume from the assessment list at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPauseOpen(false)}>
              Keep answering
            </Button>
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => save.mutate(pendingAnswers())}
            >
              Save now
            </Button>
            <Button disabled={pause.isPending} onClick={() => pause.mutate()}>
              Save and exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function CompletionScreen({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const { session, progress } = snapshot;
  return (
    <AppShell>
      <div className="mx-auto max-w-xl rounded-xl border border-border/70 bg-surface/50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-semibold">Assessment completed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session.name} was completed on{" "}
          {session.completedAt ? new Date(session.completedAt).toLocaleString() : "just now"}. Your
          responses are locked and have been published for downstream processing.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-border/70 bg-background/40 p-3">
            <dt className="text-xs text-muted-foreground">Questions answered</dt>
            <dd className="font-display text-lg">{progress.questionsAnswered}</dd>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/40 p-3">
            <dt className="text-xs text-muted-foreground">Sections completed</dt>
            <dd className="font-display text-lg">
              {progress.sectionsCompleted}/{progress.totalSections}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-muted-foreground">
          Next steps: analysis runs separately and results will appear in your workspace once
          processing is available.
        </p>
        <Button asChild className="mt-6">
          <Link to="/assess">Return to workspace</Link>
        </Button>
      </div>
    </AppShell>
  );
}
