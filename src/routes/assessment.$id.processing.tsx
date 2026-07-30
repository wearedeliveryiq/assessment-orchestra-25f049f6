import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, Ban, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { ExecutionTimeline } from "@/components/deliveryiq/execution-timeline";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentKeys } from "@/lib/assessment/client";
import { orchestratorApi, orchestratorKeys } from "@/lib/orchestrator/client";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/assessment/$id/processing")({
  head: () => ({
    meta: [
      { title: "Processing — DeliveryIQ" },
      {
        name: "description",
        content: "Watch the DeliveryIQ Intelligence Runtime execute each engine stage in sequence.",
      },
      { property: "og:title", content: "Processing — DeliveryIQ" },
      {
        property: "og:description",
        content: "Watch the DeliveryIQ Intelligence Runtime execute each engine stage in sequence.",
      },
    ],
  }),
  component: ProcessingPage,
});

function formatEta(ms: number | null): string | null {
  if (ms == null) return null;
  const seconds = Math.ceil(ms / 1000);
  return seconds < 60 ? `~${seconds}s remaining` : `~${Math.ceil(seconds / 60)} min remaining`;
}

function ProcessingPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startRequested = useRef(false);

  // Resolve (or start) the execution for this assessment. Starting is
  // idempotent — an in-flight run is returned instead of a second execution.
  const { data: execution, error } = useQuery({
    queryKey: orchestratorKeys.latest(id),
    queryFn: () => orchestratorApi.latest(id),
    enabled: hydrated,
  });

  const start = useMutation({
    mutationFn: () => orchestratorApi.execute(id),
    onSuccess: (view) => queryClient.setQueryData(orchestratorKeys.latest(id), view),
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!hydrated || execution === undefined || startRequested.current) return;
    const status = execution?.execution.status;
    if (!execution || status === "cancelled") {
      startRequested.current = true;
      start.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, execution]);

  const executionId = execution?.execution.id ?? null;

  const { data: status } = useQuery({
    queryKey: orchestratorKeys.status(executionId ?? "none"),
    queryFn: () => orchestratorApi.status(executionId as string),
    enabled: Boolean(executionId),
    refetchInterval: (query) => (query.state.data?.isTerminal ? false : 800),
  });

  const retry = useMutation({
    mutationFn: () => orchestratorApi.retry(executionId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orchestratorKeys.status(executionId ?? "none") });
      toast.success("Retrying from the failed stage — your responses are preserved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancel = useMutation({
    mutationFn: () => orchestratorApi.cancel(executionId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orchestratorKeys.status(executionId ?? "none") });
      toast.message("Cancellation requested");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (status?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.results(id) });
    }
  }, [status?.status, queryClient, id]);

  if (error) {
    return (
      <AppShell>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      </AppShell>
    );
  }

  if (!status) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Starting the Intelligence Runtime…
        </div>
      </AppShell>
    );
  }

  const isDone = status.status === "completed";
  const isFailed = status.status === "failed";
  const isCancelled = status.status === "cancelled";
  const eta = formatEta(status.progress.estimatedRemainingMs);

  return (
    <AppShell
      action={
        <StatusPill status={isDone ? "completed" : isFailed ? "failed" : "processing"} />
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Intelligence Runtime
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {execution?.execution.organisationName ?? "Assessment"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {status.progress.completed} of {status.progress.total} stages complete
            {status.retryCount > 0 ? ` · ${status.retryCount} retries` : ""}
            {!status.isTerminal && eta ? ` · ${eta}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!status.isTerminal && (
            <button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <Ban className="h-4 w-4" /> Cancel
            </button>
          )}
          {(isFailed || isCancelled) && (
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
          )}
          {isDone && (
            <Link
              to="/assessment/$id/results"
              params={{ id }}
              className="ribbon-bar inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              View results <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="ribbon-bar h-full transition-[width] duration-700"
          style={{ width: `${status.progress.percentage}%` }}
        />
      </div>

      {(isFailed || isCancelled) && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {status.errorMessage ?? "The execution was cancelled."} Your responses are safe —
            retrying resumes from the first incomplete stage.
          </p>
        </div>
      )}

      <section className="ribbon-panel mt-6 rounded-xl p-6">
        <ExecutionTimeline stages={status.stages} />
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
