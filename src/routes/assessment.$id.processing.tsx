import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StageTimeline } from "@/components/deliveryiq/stage-timeline";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { ENGINE_STAGES } from "@/lib/assessment/stages";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/assessment/$id/processing")({
  head: () => ({
    meta: [
      { title: "Processing — DeliveryIQ" },
      {
        name: "description",
        content: "Watch each DeliveryIQ engine stage run in sequence against your submission.",
      },
      { property: "og:title", content: "Processing — DeliveryIQ" },
      {
        property: "og:description",
        content: "Watch each DeliveryIQ engine stage run in sequence against your submission.",
      },
    ],
  }),
  component: ProcessingPage,
});

function ProcessingPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const advancing = useRef(false);

  const { data, error } = useQuery({
    queryKey: assessmentKeys.status(id),
    queryFn: () => assessmentApi.status(id),
    enabled: hydrated,
    refetchInterval: (query) => (query.state.data?.session.status === "processing" ? 700 : false),
  });

  const advance = useMutation({
    mutationFn: () => assessmentApi.advance(id),
    onSuccess: (status) => queryClient.setQueryData(assessmentKeys.status(id), status),
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => {
      advancing.current = false;
    },
  });

  const retry = useMutation({
    mutationFn: () => assessmentApi.retry(id),
    onSuccess: (status) => {
      queryClient.setQueryData(assessmentKeys.status(id), status);
      toast.success("Retrying failed stages — responses preserved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Drive the pipeline one stage at a time so progress is observable.
  useEffect(() => {
    if (!data || advancing.current) return;
    if (data.session.status !== "processing") return;
    if (!data.nextStage) return;
    advancing.current = true;
    advance.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.nextStage, data?.session.status]);

  useEffect(() => {
    if (data?.session.status === "completed") {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
    }
  }, [data?.session.status, queryClient]);

  if (error) {
    return (
      <AppShell>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading runtime status…
        </div>
      </AppShell>
    );
  }

  const completedCount = data.stages.filter((s) => s.status === "completed").length;
  const failed = data.stages.find((s) => s.status === "failed");
  const isDone = data.session.status === "completed";

  return (
    <AppShell action={<StatusPill status={data.session.status} />}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Engine pipeline
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{data.session.organisationName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} of {ENGINE_STAGES.length} stages complete
          </p>
        </div>

        {isDone ? (
          <Link
            to="/assessment/$id/results"
            params={{ id }}
            className="ribbon-bar inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View results <ArrowRight className="h-4 w-4" />
          </Link>
        ) : failed ? (
          <button
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
          >
            {retry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry run
          </button>
        ) : null}
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="ribbon-bar h-full transition-[width] duration-700"
          style={{ width: `${(completedCount / ENGINE_STAGES.length) * 100}%` }}
        />
      </div>

      {failed && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            The run stopped at the {failed.stage.replace("_", " ")} stage. Your responses are safe —
            retrying resumes from the failed stage.
          </p>
        </div>
      )}

      <section className="ribbon-panel mt-6 rounded-xl p-6">
        <StageTimeline stages={data.stages} />
      </section>

      {isDone && (
        <button
          onClick={() => navigate({ to: "/assessment/$id/results", params: { id } })}
          className="mt-6 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Continue to the report
        </button>
      )}
    </AppShell>
  );
}
