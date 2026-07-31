import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileQuestion, Layers, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { runtimeApi, runtimeKeys } from "@/lib/runtime/client";

export const Route = createFileRoute("/assess/")({
  head: () => ({
    meta: [
      { title: "Start an assessment — DeliveryIQ Runtime" },
      {
        name: "description",
        content:
          "Launch or resume any DeliveryIQ assessment. Every assessment is defined by a Knowledge Pack and executed by the generic runtime.",
      },
      { property: "og:title", content: "Start an assessment — DeliveryIQ Runtime" },
      {
        property: "og:description",
        content:
          "Launch or resume any DeliveryIQ assessment defined by a published Knowledge Pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentWelcome,
});

function RuntimePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-surface/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function AssessmentWelcome() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: runtimeKeys.catalogue,
    queryFn: runtimeApi.catalogue,
    enabled: hydrated,
  });

  const start = useMutation({
    mutationFn: (packId: string) => runtimeApi.start({ packId }),
    onSuccess: (snapshot) => {
      void queryClient.invalidateQueries({ queryKey: runtimeKeys.catalogue });
      void navigate({ to: "/assess/$id", params: { id: snapshot.session.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = data?.sessions ?? [];
  const openSessions = sessions.filter((session) => session.status !== "completed");

  return (
    <AppShell>
      <header className="mb-10 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Assessment Runtime
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Choose an assessment
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Every assessment below is defined entirely by a published Knowledge Pack. The runtime
          renders questions, validates answers and saves your progress automatically.
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm">
          {(error as Error).message}
        </p>
      ) : null}

      <section aria-labelledby="available" className="space-y-4">
        <h2 id="available" className="font-display text-lg font-semibold">
          Available assessments
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading || !hydrated
            ? [0, 1].map((key) => <Skeleton key={key} className="h-48 rounded-xl" />)
            : data?.assessments.map((assessment) => (
                <article
                  key={`${assessment.packId}@${assessment.packVersion}`}
                  className="flex flex-col rounded-xl border border-border/70 bg-surface/50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold">{assessment.name}</h3>
                    <RuntimePill label={assessment.status} />
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {assessment.description}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div>
                      <dt className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> Duration
                      </dt>
                      <dd className="mt-1 font-medium text-foreground">
                        ~{assessment.estimatedMinutes} min
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1">
                        <FileQuestion className="h-3.5 w-3.5" aria-hidden /> Questions
                      </dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {assessment.questionCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" aria-hidden /> Sections
                      </dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {assessment.sectionCount}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    className="mt-5"
                    disabled={start.isPending}
                    onClick={() => start.mutate(assessment.packId)}
                  >
                    {start.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <PlayCircle className="h-4 w-4" aria-hidden />
                    )}
                    Start assessment
                  </Button>
                </article>
              ))}
        </div>
      </section>

      {openSessions.length > 0 ? (
        <section aria-labelledby="resume" className="mt-12 space-y-4">
          <h2 id="resume" className="font-display text-lg font-semibold">
            Resume in progress
          </h2>
          <ul className="grid gap-3">
            {openSessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface/50 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.progress}% complete · {session.answeredCount} of{" "}
                    {session.totalQuestions} answered
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <RuntimePill label={session.status.replace("_", " ")} />
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/assess/$id" params={{ id: session.id }}>
                      <RotateCcw className="h-4 w-4" aria-hidden /> Resume
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
