import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Ban, Gauge, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { ExecutionTimeline } from "@/components/deliveryiq/execution-timeline";
import { orchestratorApi, orchestratorKeys } from "@/lib/orchestrator/client";
import type { ExecutionStatus, ExecutionView } from "@/lib/orchestrator/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/runtime/")({
  head: () => ({
    meta: [
      { title: "Runtime Monitor — DeliveryIQ" },
      {
        name: "description",
        content:
          "Monitor Intelligence Runtime executions: live progress, stage timings, retries and failure classes.",
      },
      { property: "og:title", content: "Runtime Monitor — DeliveryIQ" },
      {
        property: "og:description",
        content: "Live orchestration health, execution history and per-stage performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RuntimeMonitorPage,
});

const STATUS_TONE: Record<ExecutionStatus, string> = {
  queued: "border-border text-muted-foreground",
  starting: "border-primary/50 text-primary",
  running: "border-primary/50 text-primary",
  paused: "border-warning/50 text-warning",
  completed: "border-success/50 text-success",
  failed: "border-destructive/50 text-destructive",
  cancelled: "border-border text-muted-foreground",
};

const HEALTH_TONE: Record<string, string> = {
  healthy: "text-success",
  degraded: "text-warning",
  unhealthy: "text-destructive",
};

function ms(value: number): string {
  if (value <= 0) return "—";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`;
}

function RuntimeMonitorPage() {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [organisation, setOrganisation] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const filters = { status: status || undefined, organisation: organisation || undefined };

  const monitor = useQuery({
    queryKey: orchestratorKeys.monitor(filters),
    queryFn: () => orchestratorApi.monitor(filters),
    enabled: hydrated,
    refetchInterval: 3000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["executions", "monitor"] });

  const cancel = useMutation({
    mutationFn: (id: string) => orchestratorApi.cancel(id),
    onSuccess: () => {
      toast.message("Cancellation requested");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retry = useMutation({
    mutationFn: (id: string) => orchestratorApi.retry(id),
    onSuccess: () => {
      toast.success("Execution requeued");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = monitor.data;
  const detail: ExecutionView | undefined = data?.executions.find(
    (view) => view.execution.id === selected,
  );

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <Gauge className="h-3.5 w-3.5" />
        Internal tooling
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Runtime Monitor</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every assessment is processed by the Intelligence Runtime Orchestrator. This view shows
        live execution state, stage timings, retry behaviour and pipeline health.
      </p>

      {monitor.isError && (
        <p className="mt-6 text-sm text-destructive">{(monitor.error as Error).message}</p>
      )}

      {data && (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active", value: String(data.metrics.active) },
              { label: "Completed", value: String(data.metrics.completed) },
              { label: "Failed", value: String(data.metrics.failed) },
              {
                label: "Success rate",
                value: `${Math.round(data.metrics.successRate * 100)}%`,
                tone: HEALTH_TONE[data.metrics.pipelineHealth],
              },
            ].map((metric) => (
              <div key={metric.label} className="ribbon-panel rounded-xl p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {metric.label}
                </p>
                <p
                  className={`mt-1 font-display text-2xl font-semibold ${metric.tone ?? ""}`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </section>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {["queued", "running", "completed", "failed", "cancelled"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={organisation}
              onChange={(event) => setOrganisation(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">All organisations</option>
              {data.filters.organisations.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              average run {ms(data.metrics.averageDurationMs)} · {data.metrics.totalRetries} retries
            </span>
          </div>

          <section className="ribbon-panel mt-4 overflow-x-auto rounded-xl">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Knowledge Pack</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.executions.map((view) => (
                  <tr
                    key={view.execution.id}
                    onClick={() => setSelected(view.execution.id)}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-surface/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{view.execution.organisationName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(view.execution.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          STATUS_TONE[view.execution.status]
                        }`}
                      >
                        {view.execution.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{view.progress.percentage}%</td>
                    <td className="px-4 py-3 tabular-nums">{ms(view.execution.durationMs)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {view.execution.knowledgePackId} v{view.execution.knowledgePackVersion}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!view.isTerminal && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              cancel.mutate(view.execution.id);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Ban className="h-3 w-3" /> Cancel
                          </button>
                        )}
                        {(view.execution.status === "failed" ||
                          view.execution.status === "cancelled") && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              retry.mutate(view.execution.id);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-primary/50 px-2 py-1 text-[11px] text-primary"
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </button>
                        )}
                        <Link
                          to="/assessment/$id/processing"
                          params={{ id: view.execution.assessmentSessionId }}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.executions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No executions match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="ribbon-panel rounded-xl p-5">
              <h2 className="font-display text-lg font-semibold">Stage performance</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.stageTimings.map((timing) => (
                  <li
                    key={timing.stageId}
                    className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0"
                  >
                    <span>{timing.label}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {ms(timing.averageDurationMs)} · {timing.runs} runs
                      {timing.failures > 0 ? ` · ${timing.failures} failed` : ""}
                      {timing.retries > 0 ? ` · ${timing.retries} retries` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ribbon-panel rounded-xl p-5">
              <h2 className="font-display text-lg font-semibold">
                {detail ? `Execution detail — ${detail.execution.organisationName}` : "Execution detail"}
              </h2>
              {detail ? (
                <div className="mt-3">
                  {detail.execution.errorMessage && (
                    <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {detail.execution.errorMessage} ({detail.execution.failureClass})
                    </p>
                  )}
                  <ExecutionTimeline stages={detail.stages} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Select an execution to inspect its stages, attempts and failure classes.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
