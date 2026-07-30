import { AlertTriangle, Ban, Check, Loader2, SkipForward } from "lucide-react";
import { DEFAULT_PIPELINE } from "@/lib/orchestrator/pipeline";
import type { ExecutionStageStatus } from "@/lib/orchestrator/types";

export interface ExecutionTimelineStage {
  stageId: string;
  status: ExecutionStageStatus | string;
  attempt?: number;
  durationMs?: number;
  errorMessage?: string | null;
}

const ICONS: Record<string, typeof Check> = {
  completed: Check,
  running: Loader2,
  failed: AlertTriangle,
  skipped: SkipForward,
  cancelled: Ban,
};

const TONES: Record<string, string> = {
  completed: "border-success/50 bg-success/15 text-success",
  running: "border-primary/60 bg-primary/15 text-primary",
  failed: "border-destructive/50 bg-destructive/15 text-destructive",
  skipped: "border-warning/50 bg-warning/15 text-warning",
  cancelled: "border-border bg-muted text-muted-foreground",
};

/** Timeline of orchestrator stages, driven entirely by the pipeline definition. */
export function ExecutionTimeline({ stages }: { stages: ExecutionTimelineStage[] }) {
  return (
    <ol className="relative space-y-2">
      {DEFAULT_PIPELINE.stages.map((descriptor, index) => {
        const run = stages.find((stage) => stage.stageId === descriptor.id);
        const status = run?.status ?? "pending";
        const Icon = ICONS[status];
        const isLast = index === DEFAULT_PIPELINE.stages.length - 1;

        return (
          <li key={descriptor.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                  TONES[status] ?? "border-border bg-surface text-muted-foreground",
                ].join(" ")}
              >
                {Icon ? (
                  <Icon className={`h-4 w-4 ${status === "running" ? "animate-spin" : ""}`} />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </span>
              {!isLast && (
                <span
                  className={`mt-1 w-px flex-1 ${
                    status === "completed" ? "bg-success/40" : "bg-border"
                  }`}
                />
              )}
            </div>

            <div
              className={`mb-2 flex-1 rounded-lg border px-4 py-3 transition-colors ${
                status === "running"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : status === "failed"
                    ? "border-destructive/40 bg-destructive/[0.06]"
                    : "border-border/70 bg-surface/50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold">{descriptor.label}</p>
                <span className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                  {run?.attempt != null && run.attempt > 1 && (
                    <span className="rounded border border-warning/40 px-1.5 py-0.5 text-warning">
                      attempt {run.attempt}
                    </span>
                  )}
                  {status === "completed" && run?.durationMs ? `${run.durationMs} ms` : null}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {(status === "failed" || status === "skipped") && run?.errorMessage
                  ? run.errorMessage
                  : descriptor.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
